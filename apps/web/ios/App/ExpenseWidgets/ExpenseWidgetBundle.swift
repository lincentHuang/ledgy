import WidgetKit
import SwiftUI

@main
struct ExpenseWidgetBundle: WidgetBundle {
    var body: some Widget {
        BarcodeWidget()
        BudgetWidget()
        QuickActionWidget()
    }
}
