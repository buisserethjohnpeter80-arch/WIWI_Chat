package app.wiwichat.lan;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "WIWILan")
public class WIWILanPlugin extends Plugin {
    private static final String TAG = "WIWILan";
    private static final String SERVICE_TYPE = "_wiwichat._tcp.";
    private static final int MAX_FRAME_BYTES = 16384;
    private static final int TIMEOUT_MS = 6000;

    private final ExecutorService io = Executors.newCachedThreadPool();
    private final Map<String, NsdServiceInfo> peers = new ConcurrentHashMap<>();
    private final ArrayDeque<NsdServiceInfo> toResolve = new ArrayDeque<>();
    private final AtomicBoolean started = new AtomicBoolean(false);
    private NsdManager nsd;
    private NsdManager.RegistrationListener registration;
    private NsdManager.DiscoveryListener discovery;
    private boolean resolving = false;
    private ServerSocket server;
    private WifiManager.MulticastLock multicastLock;
    private String myId;
    private String myName;

    @PluginMethod
    public void start(PluginCall call) {
        String id = call.getString("peerId", "");
        String name = call.getString("name", "").trim();
        if (!id.matches("WIWI-[0-9a-f]{20}") || name.isEmpty() || name.length() > 32) {
            call.reject("Invalid identity");
            return;
        }
        if (started.get()) {
            if (!id.equals(myId)) { call.reject("Stop the old identity before starting"); return; }
            JSObject ok = new JSObject(); ok.put("running", true); call.resolve(ok);
            return;
        }
        this.myId = id;
        this.myName = name;
        try {
            server = new ServerSocket(0);
            server.setReuseAddress(true);
            nsd = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                multicastLock = wifi.createMulticastLock("wiwichat-discovery");
                multicastLock.setReferenceCounted(false);
                multicastLock.acquire();
            }
            started.set(true);
            launchServer();
            advertise();
            discover();
            JSObject ok = new JSObject(); ok.put("running", true); call.resolve(ok);
            status(true, null);
        } catch (Exception ex) {
            stopInternal();
            call.reject("Unable to start local network: " + ex.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopInternal();
        call.resolve();
    }

    @PluginMethod
    public void send(PluginCall call) {
        String peerId = call.getString("peerId", "");
        String id = call.getString("id", "");
        String text = call.getString("text", "");
        String fromId = call.getString("fromId", "");
        String fromName = call.getString("fromName", "");
        String sentAt = call.getString("sentAt", "");
        if (!started.get() || !peerId.matches("WIWI-[0-9a-f]{20}") || !id.matches("[A-Za-z0-9_-]{8,80}")
                || !myId.equals(fromId) || !myName.equals(fromName) || text.trim().isEmpty() || text.length() > 4000
                || !Integer.valueOf(1).equals(call.getInt("v")) || !"message".equals(call.getString("type"))) {
            call.reject("Invalid message or LAN is not active"); return;
        }
        NsdServiceInfo service = peers.get(peerId);
        if (service == null || service.getHost() == null || service.getPort() < 1) {
            call.reject("Device unavailable. Keep both phones on the same Wi-Fi."); return;
        }
        io.execute(() -> {
            try (Socket socket = new Socket()) {
                socket.connect(new java.net.InetSocketAddress(service.getHost(), service.getPort()), TIMEOUT_MS);
                socket.setSoTimeout(TIMEOUT_MS);
                JSONObject frame = new JSONObject();
                frame.put("v", 1); frame.put("type", "message"); frame.put("id", id);
                frame.put("fromId", fromId); frame.put("fromName", fromName);
                frame.put("text", text); frame.put("sentAt", sentAt);
                writeLine(socket.getOutputStream(), frame.toString());
                JSONObject ack = new JSONObject(readLine(socket.getInputStream()));
                if (ack.optInt("v") != 1 || !"ack".equals(ack.optString("type")) || !id.equals(ack.optString("id"))) {
                    throw new IOException("Receiver did not acknowledge this message");
                }
                JSObject result = new JSObject(); result.put("accepted", true);
                call.resolve(result);
            } catch (Exception ex) {
                call.reject("LAN send failed: " + ex.getMessage());
            }
        });
    }

    private void launchServer() {
        io.execute(() -> {
            while (started.get()) {
                try {
                    Socket incoming = server.accept();
                    io.execute(() -> handleIncoming(incoming));
                } catch (IOException ex) {
                    if (started.get()) status(false, "LAN listener stopped: " + ex.getMessage());
                    return;
                }
            }
        });
    }

    private void handleIncoming(Socket socket) {
        try (Socket s = socket) {
            s.setSoTimeout(TIMEOUT_MS);
            JSONObject msg = new JSONObject(readLine(s.getInputStream()));
            String sender = msg.optString("fromId", "");
            String name = msg.optString("fromName", "");
            String text = msg.optString("text", "");
            String id = msg.optString("id", "");
            String sentAt = msg.optString("sentAt", "");
            if (msg.optInt("v") != 1 || !"message".equals(msg.optString("type"))
                    || !sender.matches("WIWI-[0-9a-f]{20}") || sender.equals(myId)
                    || !id.matches("[A-Za-z0-9_-]{8,80}") || name.trim().isEmpty()
                    || name.length() > 32 || text.trim().isEmpty() || text.length() > 4000
                    || sentAt.length() < 10 || sentAt.length() > 50) return;
            JSObject payload = new JSObject();
            payload.put("v", 1); payload.put("type", "message"); payload.put("id", id);
            payload.put("fromId", sender); payload.put("fromName", name);
            payload.put("text", text); payload.put("sentAt", sentAt);
            notifyListeners("message", payload);
            JSONObject ack = new JSONObject(); ack.put("v", 1); ack.put("type", "ack"); ack.put("id", id);
            writeLine(s.getOutputStream(), ack.toString());
        } catch (Exception ex) { Log.w(TAG, "Incoming LAN message rejected", ex); }
    }

    private void advertise() {
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName(myId);
        info.setServiceType(SERVICE_TYPE);
        info.setPort(server.getLocalPort());
        info.setAttribute("name", myName);
        registration = new NsdManager.RegistrationListener() {
            @Override public void onServiceRegistered(NsdServiceInfo serviceInfo) {
                // On a collision Android may rename the service; our protocol requires the exact peerId.
                if (!myId.equals(serviceInfo.getServiceName())) status(false, "Service name collision. Restart WIWIchat.");
            }
            @Override public void onRegistrationFailed(NsdServiceInfo info, int code) { status(false, "Bonjour advertising failed: " + code); }
            @Override public void onServiceUnregistered(NsdServiceInfo info) { }
            @Override public void onUnregistrationFailed(NsdServiceInfo info, int code) { Log.w(TAG, "Unregister error " + code); }
        };
        nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, registration);
    }

    private void discover() {
        discovery = new NsdManager.DiscoveryListener() {
            @Override public void onDiscoveryStarted(String type) { }
            @Override public void onDiscoveryStopped(String type) { }
            @Override public void onStartDiscoveryFailed(String type, int code) { status(false, "Discovery failed: " + code); }
            @Override public void onStopDiscoveryFailed(String type, int code) { Log.w(TAG, "Stop discovery error " + code); }
            @Override public void onServiceFound(NsdServiceInfo info) {
                String id = info.getServiceName();
                if (id.matches("WIWI-[0-9a-f]{20}") && !id.equals(myId)) queueResolve(info);
            }
            @Override public void onServiceLost(NsdServiceInfo info) {
                String id = info.getServiceName();
                peers.remove(id);
                JSObject value = new JSObject(); value.put("id", id);
                notifyListeners("peerLost", value);
            }
        };
        nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discovery);
    }

    private synchronized void queueResolve(NsdServiceInfo info) {
        toResolve.addLast(info);
        resolveNext();
    }
    private synchronized void resolveNext() {
        if (resolving || !started.get() || toResolve.isEmpty()) return;
        resolving = true;
        NsdServiceInfo item = toResolve.removeFirst();
        try {
            nsd.resolveService(item, new NsdManager.ResolveListener() {
                @Override public void onResolveFailed(NsdServiceInfo info, int error) { finishResolve(); }
                @Override public void onServiceResolved(NsdServiceInfo info) {
                    if (started.get() && info.getHost() != null && info.getPort() > 0) {
                        String id = info.getServiceName();
                        peers.put(id, info);
                        JSObject value = new JSObject(); value.put("id", id);
                        String name = "Phone " + id.substring(id.length() - 4);
                        byte[] attr = info.getAttributes().get("name");
                        if (attr != null) {
                            String decoded = new String(attr, StandardCharsets.UTF_8).trim();
                            if (!decoded.isEmpty()) name = decoded.length() > 32 ? decoded.substring(0, 32) : decoded;
                        }
                        value.put("name", name);
                        notifyListeners("peerFound", value);
                    }
                    finishResolve();
                }
            });
        } catch (Exception ex) { resolving = false; resolveNext(); }
    }
    private synchronized void finishResolve() { resolving = false; resolveNext(); }

    private void status(boolean running, String error) {
        JSObject payload = new JSObject(); payload.put("running", running);
        if (error != null) payload.put("reason", error);
        notifyListeners("status", payload);
    }
    private synchronized void stopInternal() {
        started.set(false);
        if (discovery != null && nsd != null) {
            try { nsd.stopServiceDiscovery(discovery); } catch (Exception ignored) { }
        }
        if (registration != null && nsd != null) {
            try { nsd.unregisterService(registration); } catch (Exception ignored) { }
        }
        discovery = null;
        registration = null;
        try { if (server != null) server.close(); } catch (IOException ignored) { }
        server = null;
        if (multicastLock != null && multicastLock.isHeld()) multicastLock.release();
        multicastLock = null;
        peers.clear();
        toResolve.clear();
        resolving = false;
        status(false, null);
    }
    @Override protected void handleOnDestroy() {
        stopInternal();
        io.shutdownNow();
        super.handleOnDestroy();
    }
    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (int n; (n = in.read()) >= 0;) {
            if (n == '\n') return out.toString(StandardCharsets.UTF_8.name());
            if (out.size() >= MAX_FRAME_BYTES) throw new IOException("LAN frame too large");
            out.write(n);
        }
        throw new IOException("LAN connection ended before a full frame");
    }
    private static void writeLine(OutputStream out, String json) throws IOException {
        byte[] bytes = (json + "\n").getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_FRAME_BYTES) throw new IOException("LAN frame too large");
        out.write(bytes); out.flush();
    }
}
