import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise)
    ]

    @objc func syncWidgetData(_ call: CAPPluginCall) {
        guard let data = call.getObject("data") else {
            call.reject("Missing data object")
            return
        }

        let userDefaults = UserDefaults(suiteName: "group.com.zhizhangkun.app") ?? UserDefaults.standard

        if let carrierCode = data["carrierCode"] as? String {
            userDefaults.set(carrierCode, forKey: "carrierCode")
        }
        if let todayExpense = data["todayExpense"] as? Double {
            userDefaults.set(todayExpense, forKey: "todayExpense")
        }
        if let monthExpense = data["monthExpense"] as? Double {
            userDefaults.set(monthExpense, forKey: "monthExpense")
        }
        if let monthBudget = data["monthBudget"] as? Double {
            userDefaults.set(monthBudget, forKey: "monthBudget")
        }
        if let budgetRemaining = data["budgetRemaining"] as? Double {
            userDefaults.set(budgetRemaining, forKey: "budgetRemaining")
        }
        if let activeLedgerName = data["activeLedgerName"] as? String {
            userDefaults.set(activeLedgerName, forKey: "activeLedgerName")
        }
        userDefaults.set(Date().timeIntervalSince1970, forKey: "lastUpdated")
        userDefaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve(["success": true])
    }

    @objc func reloadWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["success": true])
    }
}
