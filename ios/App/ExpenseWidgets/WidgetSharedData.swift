import Foundation

public struct WidgetSharedData {
    public static let suiteName = "group.com.zhizhangkun.app"

    public static func get() -> (
        carrierCode: String,
        todayExpense: Double,
        monthExpense: Double,
        monthBudget: Double,
        budgetRemaining: Double,
        activeLedgerName: String
    ) {
        let defaults = UserDefaults(suiteName: suiteName) ?? UserDefaults.standard
        let carrierCode = defaults.string(forKey: "carrierCode") ?? "/AB1234+"
        let todayExpense = defaults.double(forKey: "todayExpense")
        let monthExpense = defaults.double(forKey: "monthExpense")
        let monthBudget = defaults.double(forKey: "monthBudget") > 0 ? defaults.double(forKey: "monthBudget") : 35000
        let budgetRemaining = defaults.object(forKey: "budgetRemaining") != nil ? defaults.double(forKey: "budgetRemaining") : max(0, monthBudget - monthExpense)
        let activeLedgerName = defaults.string(forKey: "activeLedgerName") ?? "個人私帳"

        return (carrierCode, todayExpense, monthExpense, monthBudget, budgetRemaining, activeLedgerName)
    }
}
