import Foundation
import Capacitor
import AuthenticationServices

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?
    private var controllerDelegate: Delegate?

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.activeCall = call

            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]

            let delegate = Delegate(plugin: self)
            self.controllerDelegate = delegate

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests()
        }
    }

    fileprivate func resolve(_ payload: [String: Any]) {
        activeCall?.resolve(payload)
        activeCall = nil
        controllerDelegate = nil
    }

    fileprivate func reject(_ message: String, code: String? = nil) {
        activeCall?.reject(message, code)
        activeCall = nil
        controllerDelegate = nil
    }

    fileprivate var anchorWindow: ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    private class Delegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        weak var plugin: AppleSignInPlugin?

        init(plugin: AppleSignInPlugin) {
            self.plugin = plugin
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let identityToken = String(data: tokenData, encoding: .utf8) else {
                plugin?.reject("Missing identity token")
                return
            }

            var result: [String: Any] = [
                "identityToken": identityToken,
                "user": credential.user
            ]

            if let codeData = credential.authorizationCode,
               let code = String(data: codeData, encoding: .utf8) {
                result["authorizationCode"] = code
            }
            if let email = credential.email {
                result["email"] = email
            }
            if let name = credential.fullName {
                var parts: [String: String] = [:]
                if let given = name.givenName { parts["givenName"] = given }
                if let family = name.familyName { parts["familyName"] = family }
                if !parts.isEmpty { result["fullName"] = parts }
            }

            plugin?.resolve(result)
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            let nsError = error as NSError
            if nsError.code == ASAuthorizationError.canceled.rawValue {
                plugin?.reject("User canceled", code: "cancelled")
            } else {
                plugin?.reject(error.localizedDescription)
            }
        }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            return plugin?.anchorWindow ?? ASPresentationAnchor()
        }
    }
}
