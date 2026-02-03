/**
 * Now watcher: file watch + app activation + health server.
 * Reads config from NOW_WATCHER_CONFIG (path to JSON).
 * Config: { paths: string[], deeplink: string, port?: number, dirtyPath?: string }
 * On file change or app activation: debounce 300ms then write dirtyPath and open(deeplink).
 */

import Foundation
import AppKit
import Dispatch
import Darwin

private let debounceMs: Int = 300
private let defaultPort: Int = 9847

struct Config {
  var paths: [String]
  var deeplink: String
  var dirtyPath: String
  var port: Int
  var pidPath: String
  let configPath: String
}

func loadConfig(configPath: String) throws -> Config {
  let data = try Data(contentsOf: URL(fileURLWithPath: configPath))
  let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
  guard let j = json,
        let paths = j["paths"] as? [String],
        let deeplink = j["deeplink"] as? String else {
    throw NSError(domain: "NowWatcher", code: 1, userInfo: [NSLocalizedDescriptionKey: "Config must have paths (array) and deeplink (string)"])
  }
  let port = (j["port"] as? Int) ?? defaultPort
  let dir = (configPath as NSString).deletingLastPathComponent
  let dirtyPath = (j["dirtyPath"] as? String) ?? (dir + "/now-watcher-dirty.txt")
  let pidPath = (j["pidPath"] as? String) ?? (NSTemporaryDirectory() + "now-watcher-\(port).pid")
  return Config(paths: paths, deeplink: deeplink, dirtyPath: dirtyPath, port: port, pidPath: pidPath, configPath: configPath)
}

/// Writes dirty file then opens deeplink. When triggerApp is nil (e.g. file change), no "app" key — menu bar resolves from frontmost. bundleId written as "" when nil so JSON stays consistent.
func fire(deeplink: String, dirtyPath: String, triggerApp: (bundleId: String?, name: String)? = nil) {
  if !dirtyPath.isEmpty {
    let ts = Int64(Date().timeIntervalSince1970 * 1000)
    var obj: [String: Any] = ["ts": ts]
    if let app = triggerApp {
      obj["app"] = ["bundleId": app.bundleId ?? "", "name": app.name]
    }
    if let data = try? JSONSerialization.data(withJSONObject: obj),
       let str = String(data: data, encoding: .utf8) {
      try? str.write(toFile: dirtyPath, atomically: true, encoding: .utf8)
    }
  }
  // Run open on a background queue so we never block the main run loop (Process.run() is synchronous).
  // -g: do not bring the application to the foreground (avoids stealing focus from the frontmost app).
  DispatchQueue.global(qos: .userInitiated).async {
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: "/usr/bin/open")
    proc.arguments = ["-g", deeplink]
    try? proc.run()
    proc.waitUntilExit()
  }
}

func startHealthServer(port: Int) -> Int32 {
  let fd = Darwin.socket(AF_INET, SOCK_STREAM, 0)
  guard fd >= 0 else { return -1 }
  var opt: Int32 = 1
  setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, socklen_t(MemoryLayout<Int32>.size))
  var addr = sockaddr_in()
  addr.sin_family = sa_family_t(AF_INET)
  addr.sin_port = UInt16(port).bigEndian
  addr.sin_addr.s_addr = INADDR_ANY
  let bound = withUnsafePointer(to: &addr) {
    $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
      Darwin.bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
    }
  }
  guard bound == 0 else { Darwin.close(fd); return -1 }
  guard Darwin.listen(fd, 5) == 0 else { Darwin.close(fd); return -1 }
  return fd
}

func handleHealthConnections(listenFd: Int32, queue: DispatchQueue) {
  let source = DispatchSource.makeReadSource(fileDescriptor: listenFd, queue: queue)
  source.setEventHandler {
    var addr = sockaddr_in()
    var len = socklen_t(MemoryLayout<sockaddr_in>.size)
    let client = withUnsafeMutablePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.accept(listenFd, $0, &len)
      }
    }
    guard client >= 0 else { return }
    DispatchQueue.global(qos: .utility).async {
      var buf = [UInt8](repeating: 0, count: 512)
      _ = Darwin.read(client, &buf, 512)
      let req = String(bytes: buf, encoding: .utf8) ?? ""
      let response: String
      if req.hasPrefix("GET /health") {
        response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
      } else {
        response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
      }
      if let data = response.data(using: .utf8) {
        data.withUnsafeBytes { buf in
          if let base = buf.baseAddress {
            _ = Darwin.write(client, base, buf.count)
          }
        }
      }
      Darwin.close(client)
    }
  }
  source.resume()
}

func openFileForWatch(_ path: String) -> Int32? {
  let fd = path.withCString { Darwin.open($0, O_RDONLY) }
  return fd >= 0 ? fd : nil
}

func run() {
  guard let configPath = ProcessInfo.processInfo.environment["NOW_WATCHER_CONFIG"], !configPath.isEmpty else {
    fputs("NOW_WATCHER_CONFIG is not set\n", stderr)
    exit(1)
  }
  guard var config = try? loadConfig(configPath: configPath) else {
    fputs("Invalid or missing config\n", stderr)
    exit(1)
  }

  try? String(ProcessInfo.processInfo.processIdentifier).write(toFile: config.pidPath, atomically: true, encoding: .utf8)

  let debounceQueue = DispatchQueue.main
  var debounceWork: DispatchWorkItem?
  /// App to write into dirty file when we fire. File-change handler passes (nil, nil) and clears this; app-activation passes (bundleId, name). Within the debounce window, the last scheduled call wins — so a file change after an app switch clears the app and the menu bar will resolve from frontmost (e.g. Raycast) instead of the app that triggered the switch.
  var lastTriggerApp: (bundleId: String?, name: String)?
  let scheduleFire: (String?, String?) -> Void = { bundleId, name in
    debounceWork?.cancel()
    if let n = name, !n.isEmpty {
      lastTriggerApp = (bundleId, n)
    } else {
      lastTriggerApp = nil
    }
    let work = DispatchWorkItem {
      let app = lastTriggerApp
      lastTriggerApp = nil
      fire(deeplink: config.deeplink, dirtyPath: config.dirtyPath, triggerApp: app)
    }
    debounceWork = work
    debounceQueue.asyncAfter(deadline: .now() + .milliseconds(debounceMs), execute: work)
  }

  var pathSources: [String: DispatchSourceFileSystemObject] = [:]
  var configSource: DispatchSourceFileSystemObject?

  func applyPathWatches() {
    for (_, src) in pathSources {
      src.cancel()
    }
    pathSources.removeAll()
    for path in config.paths {
      guard let fd = openFileForWatch(path) else { continue }
      let src = DispatchSource.makeFileSystemObjectSource(fileDescriptor: fd, eventMask: .write, queue: debounceQueue)
      src.setEventHandler { scheduleFire(nil, nil) }
      src.setCancelHandler { Darwin.close(fd) }
      src.resume()
      pathSources[path] = src
    }
  }

  func reloadConfig() {
    guard let c = try? loadConfig(configPath: configPath) else { return }
    config = c
    applyPathWatches()
  }

  applyPathWatches()

  if let configFd = openFileForWatch(configPath) {
    configSource = DispatchSource.makeFileSystemObjectSource(fileDescriptor: configFd, eventMask: .write, queue: debounceQueue)
    configSource?.setEventHandler { reloadConfig() }
    configSource?.setCancelHandler { Darwin.close(configFd) }
    configSource?.resume()
  }

  let listenFd = startHealthServer(port: config.port)
  if listenFd >= 0 {
    handleHealthConnections(listenFd: listenFd, queue: debounceQueue)
  }

  NSWorkspace.shared.notificationCenter.addObserver(
    forName: NSWorkspace.didActivateApplicationNotification,
    object: nil,
    queue: .main
  ) { notif in
    let running = notif.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
    let name = running?.localizedName ?? "?"
    let bundleId = running?.bundleIdentifier
    scheduleFire(bundleId, name)
  }

  RunLoop.main.run()
}

run()
