import Capacitor

@objc(LunaraBridgeViewController)
final class LunaraBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LunaraNativePlugin())
    }
}

