import UIKit
import Capacitor
import WebKit

class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Match the app's dark theme so any native compositing seam (e.g.
        // during rotation or before the first paint) reads as black, not
        // the system default white/gray.
        self.view.backgroundColor = .black

        guard let webView = self.webView else { return }

        // Without this, the webView's own scroll insets get auto-adjusted
        // for the safe area, which visually pushes CSS content down but
        // leaves the true notch/status-bar strip painted by the native
        // view's background instead of the page's own background — exactly
        // the "black gap at the top" seen despite the CSS being correct.
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Disable the native "swipe from edge" back/forward navigation gesture
        webView.allowsBackForwardNavigationGestures = false

        // Disable horizontal rubber-banding so the page can't be dragged sideways
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.alwaysBounceVertical = true

        // Disable pinch-to-zoom
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false

        // The app's own pages each manage their own scrolling internally
        // (.page / .admin-main use overflow-y:auto), so the outer webView
        // scroll view never needs to move at all. Snap it back to (0,0)
        // whenever the keyboard opens or closes — that's the specific
        // moment a known WKWebView bug can desync the scroll view's content
        // size from the visible viewport and let the page be dragged into
        // blank space that isn't really part of the layout.
        NotificationCenter.default.addObserver(
            self, selector: #selector(resetWebViewScrollOffset),
            name: UIResponder.keyboardWillShowNotification, object: nil
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(resetWebViewScrollOffset),
            name: UIResponder.keyboardWillHideNotification, object: nil
        )
    }

    @objc private func resetWebViewScrollOffset() {
        webView?.scrollView.setContentOffset(.zero, animated: false)
    }

}
