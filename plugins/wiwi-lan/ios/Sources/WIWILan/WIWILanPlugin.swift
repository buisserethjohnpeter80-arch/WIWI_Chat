import Foundation
import Capacitor
import Network

@objc(WIWILanPlugin)
public class WIWILanPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WIWILanPlugin"
    public let jsName = "WIWILan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "app.wiwichat.lan")
    private let serviceType = "_wiwichat._tcp"
    private let maxFrameSize = 16384
    private var listener: NWListener?
    private var browser: NWBrowser?
    private var peers: [String: NWEndpoint] = [:]
    private var peerNames: [String: String] = [:]
    private var myId = ""
    private var myName = ""
    private var active = false

    @objc func start(_ call: CAPPluginCall) {
        guard let id = call.getString("peerId"), Self.validPeer(id),
              let name = call.getString("name")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !name.isEmpty, name.count <= 32 else {
            call.reject("Invalid device identity")
            return
        }
        queue.async { [weak self] in
            guard let self = self else { call.reject("LAN plugin was destroyed"); return }
            if self.active {
                if self.myId == id { call.resolve(["running": true]) }
                else { call.reject("Stop the previous identity before starting") }
                return
            }
            do {
                let listener = try NWListener(using: .tcp, on: .any)
                var txt = NWTXTRecord()
                _ = txt.setEntry(.string(name), for: "name")
                listener.service = NWListener.Service(name: id, type: self.serviceType, domain: nil, txtRecord: txt)
                self.myId = id
                self.myName = name
                self.listener = listener
                listener.stateUpdateHandler = { [weak self] state in
                    guard let self = self else { return }
                    switch state {
                    case .ready:
                        self.active = true
                        self.beginBrowsing()
                        self.emit("status", ["running": true])
                        call.resolve(["running": true])
                    case .failed(let error):
                        self.emit("status", ["running": false, "reason": error.localizedDescription])
                        self.stopInternal()
                        call.reject("Unable to advertise on local network: \(error.localizedDescription)")
                    default: break
                    }
                }
                listener.newConnectionHandler = { [weak self] connection in
                    self?.handleIncoming(connection)
                }
                listener.start(queue: self.queue)
            } catch {
                self.stopInternal()
                call.reject("Cannot start LAN listener: \(error.localizedDescription)")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        queue.async { [weak self] in
            self?.stopInternal()
            call.resolve()
        }
    }

    @objc func send(_ call: CAPPluginCall) {
        guard let to = call.getString("peerId"), Self.validPeer(to),
              let id = call.getString("id"), id.range(of: "^[A-Za-z0-9_-]{8,80}$", options: .regularExpression) != nil,
              let fromId = call.getString("fromId"), Self.validPeer(fromId),
              let fromName = call.getString("fromName"),
              let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.count <= 4000,
              let sentAt = call.getString("sentAt"), sentAt.count >= 10, sentAt.count <= 50,
              call.getInt("v") == 1, call.getString("type") == "message" else {
            call.reject("Invalid LAN message")
            return
        }
        queue.async { [weak self] in
            guard let self = self, self.active, fromId == self.myId, fromName == self.myName,
                  let endpoint = self.peers[to] else {
                call.reject("Device unavailable. Keep both phones on the same Wi-Fi")
                return
            }
            let payload: [String: Any] = ["v": 1, "type": "message", "id": id,
                "fromId": fromId, "fromName": fromName, "text": text, "sentAt": sentAt]
            guard let json = try? JSONSerialization.data(withJSONObject: payload), json.count < self.maxFrameSize else {
                call.reject("Invalid frame")
                return
            }
            let connection = NWConnection(to: endpoint, using: .tcp)
            var finished = false
            let finish: (String?) -> Void = { error in
                if finished { return }
                finished = true
                connection.cancel()
                if let error = error { call.reject(error) }
                else { call.resolve(["accepted": true]) }
            }
            connection.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    var data = json
                    data.append(0x0A)
                    connection.send(content: data, completion: .contentProcessed { sendError in
                        if let sendError = sendError { finish("Send failed: \(sendError.localizedDescription)"); return }
                        self.readFrame(connection, accumulated: Data()) { ack in
                            guard let ack = ack, let obj = try? JSONSerialization.jsonObject(with: ack) as? [String: Any],
                                  obj["v"] as? Int == 1, obj["type"] as? String == "ack",
                                  obj["id"] as? String == id else {
                                finish("No acknowledgement received")
                                return
                            }
                            finish(nil)
                        }
                    })
                case .failed(let error): finish("Connection failed: \(error.localizedDescription)")
                case .cancelled: if !finished { finish("Connection cancelled") }
                default: break
                }
            }
            connection.start(queue: self.queue)
            self.queue.asyncAfter(deadline: .now() + 7) { finish("Connection timed out") }
        }
    }

    private func beginBrowsing() {
        let browser = NWBrowser(for: .bonjourWithTXTRecord(type: serviceType, domain: nil), using: .tcp)
        self.browser = browser
        browser.browseResultsChangedHandler = { [weak self] results, _ in
            guard let self = self else { return }
            var nextPeers: [String: NWEndpoint] = [:]
            var nextNames: [String: String] = [:]
            for result in results {
                guard case let .service(name, _, _, _) = result.endpoint,
                      Self.validPeer(name), name != self.myId else { continue }
                nextPeers[name] = result.endpoint
                var nickname = "Phone \(name.suffix(4))"
                if case let .bonjour(txt) = result.metadata,
                   case let .string(value) = txt.getEntry(for: "name"), !value.isEmpty {
                    nickname = String(value.prefix(32))
                }
                nextNames[name] = nickname
                if self.peers[name] == nil || self.peerNames[name] != nickname {
                    self.emit("peerFound", ["id": name, "name": nickname])
                }
            }
            for id in self.peers.keys where nextPeers[id] == nil {
                self.emit("peerLost", ["id": id])
            }
            self.peers = nextPeers
            self.peerNames = nextNames
        }
        browser.stateUpdateHandler = { [weak self] state in
            if case let .failed(error) = state {
                self?.emit("status", ["running": false, "reason": "Discovery: \(error.localizedDescription)"])
            }
        }
        browser.start(queue: queue)
    }

    private func handleIncoming(_ connection: NWConnection) {
        connection.stateUpdateHandler = { [weak self] state in
            guard let self = self else { connection.cancel(); return }
            switch state {
            case .ready:
                self.readFrame(connection, accumulated: Data()) { payload in
                    guard let payload = payload,
                          let message = try? JSONSerialization.jsonObject(with: payload) as? [String: Any],
                          message["v"] as? Int == 1, message["type"] as? String == "message",
                          let id = message["id"] as? String,
                          id.range(of: "^[A-Za-z0-9_-]{8,80}$", options: .regularExpression) != nil,
                          let sender = message["fromId"] as? String, Self.validPeer(sender), sender != self.myId,
                          let senderName = message["fromName"] as? String, !senderName.isEmpty, senderName.count <= 32,
                          let text = message["text"] as? String, !text.isEmpty, text.count <= 4000,
                          let sentAt = message["sentAt"] as? String, sentAt.count >= 10, sentAt.count <= 50 else {
                        connection.cancel()
                        return
                    }
                    self.emit("message", ["v": 1, "type": "message", "id": id, "fromId": sender,
                                          "fromName": senderName, "text": text, "sentAt": sentAt])
                    if let ack = try? JSONSerialization.data(withJSONObject: ["v": 1, "type": "ack", "id": id]) {
                        var data = ack
                        data.append(0x0A)
                        connection.send(content: data, completion: .contentProcessed { _ in connection.cancel() })
                    } else { connection.cancel() }
                }
            case .failed, .cancelled: connection.cancel()
            default: break
            }
        }
        connection.start(queue: queue)
    }

    private func readFrame(_ connection: NWConnection, accumulated: Data, completion: @escaping (Data?) -> Void) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] chunk, _, complete, error in
            guard let self = self else { completion(nil); return }
            var buffer = accumulated
            if let chunk = chunk { buffer.append(chunk) }
            if buffer.count > self.maxFrameSize || error != nil { completion(nil); return }
            if let newline = buffer.firstIndex(of: 0x0A) {
                completion(buffer.prefix(upTo: newline))
            } else if complete { completion(nil) }
            else { self.readFrame(connection, accumulated: buffer, completion: completion) }
        }
    }

    private func emit(_ event: String, _ payload: [String: Any]) {
        DispatchQueue.main.async { [weak self] in self?.notifyListeners(event, data: payload) }
    }
    private func stopInternal() {
        browser?.cancel(); browser = nil
        listener?.cancel(); listener = nil
        peers.removeAll(); peerNames.removeAll()
        active = false
        emit("status", ["running": false])
    }
    private static func validPeer(_ value: String) -> Bool {
        return value.range(of: "^WIWI-[0-9a-f]{20}$", options: .regularExpression) != nil
    }
    override public func handleOnDestroy() {
        queue.async { [weak self] in self?.stopInternal() }
    }
}
