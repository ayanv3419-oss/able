import AppKit
import Foundation

let ableURL = "https://able-alpha.vercel.app/"
let chromePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

for browserPath in chromePaths where FileManager.default.isExecutableFile(atPath: browserPath) {
    let browser = Process()
    browser.executableURL = URL(fileURLWithPath: browserPath)
    browser.arguments = ["--app=\(ableURL)", "--new-window"]
    try? browser.run()
    exit(EXIT_SUCCESS)
}

if let url = URL(string: ableURL) {
    NSWorkspace.shared.open(url)
}
