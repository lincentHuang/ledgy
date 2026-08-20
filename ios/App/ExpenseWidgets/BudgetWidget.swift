import WidgetKit
import SwiftUI

struct BudgetEntry: TimelineEntry {
    let date: Date
    let todayExpense: Double
    let monthExpense: Double
    let monthBudget: Double
    let budgetRemaining: Double
    let activeLedgerName: String
}

struct BudgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BudgetEntry {
        BudgetEntry(
            date: Date(),
            todayExpense: 320,
            monthExpense: 10500,
            monthBudget: 35000,
            budgetRemaining: 24500,
            activeLedgerName: "個人私帳"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (BudgetEntry) -> Void) {
        let data = WidgetSharedData.get()
        completion(BudgetEntry(
            date: Date(),
            todayExpense: data.todayExpense,
            monthExpense: data.monthExpense,
            monthBudget: data.monthBudget,
            budgetRemaining: data.budgetRemaining,
            activeLedgerName: data.activeLedgerName
        ))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetEntry>) -> Void) {
        let data = WidgetSharedData.get()
        let entry = BudgetEntry(
            date: Date(),
            todayExpense: data.todayExpense,
            monthExpense: data.monthExpense,
            monthBudget: data.monthBudget,
            budgetRemaining: data.budgetRemaining,
            activeLedgerName: data.activeLedgerName
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct BudgetWidgetView: View {
    var entry: BudgetEntry
    @Environment(\.widgetFamily) var family

    var progress: Double {
        guard entry.monthBudget > 0 else { return 0 }
        return min(1.0, entry.monthExpense / entry.monthBudget)
    }

    var body: some View {
        ZStack {
            Color(red: 3/255, green: 7/255, blue: 18/255) // #030712

            if family == .systemSmall {
                // Small Widget Layout
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(entry.activeLedgerName)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(red: 168/255, green: 85/255, blue: 247/255))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 88/255, green: 28/255, blue: 135/255).opacity(0.4))
                            .cornerRadius(6)
                        Spacer()
                        Circle()
                            .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                            .frame(width: 6, height: 6)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 1) {
                        Text("今日支出")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.gray)
                        Text("$\(Int(entry.todayExpense))")
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text("剩餘預算")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                            Spacer()
                            Text("$\(Int(entry.budgetRemaining))")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                        }

                        // Progress Bar
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.white.opacity(0.1))
                                    .frame(height: 5)
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color(red: 16/255, green: 185/255, blue: 129/255), Color(red: 20/255, green: 184/255, blue: 166/255)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geo.size.width * CGFloat(progress), height: 5)
                            }
                        }
                        .frame(height: 5)
                    }
                }
                .padding(14)
            } else {
                // Medium Widget Layout
                VStack(spacing: 12) {
                    HStack {
                        HStack(spacing: 6) {
                            Text("📊 預算總覽")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                            Text(entry.activeLedgerName)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(red: 168/255, green: 85/255, blue: 247/255))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color(red: 88/255, green: 28/255, blue: 135/255).opacity(0.4))
                                .cornerRadius(6)
                        }
                        Spacer()
                        Text("智帳君 AI")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.gray)
                    }

                    HStack(spacing: 12) {
                        // Left: Today Expense Card
                        VStack(alignment: .leading, spacing: 3) {
                            Text("今日支出")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.gray)
                            Text("$\(Int(entry.todayExpense))")
                                .font(.system(size: 24, weight: .heavy, design: .rounded))
                                .foregroundColor(Color(red: 248/255, green: 113/255, blue: 113/255))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )

                        // Right: Monthly Budget & Remaining
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("本月剩餘預算")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.gray)
                                Spacer()
                                Text("$\(Int(entry.budgetRemaining))")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                            }

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.white.opacity(0.1))
                                        .frame(height: 6)
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(
                                            LinearGradient(
                                                colors: [Color(red: 16/255, green: 185/255, blue: 129/255), Color(red: 20/255, green: 184/255, blue: 166/255)],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .frame(width: geo.size.width * CGFloat(progress), height: 6)
                                }
                            }
                            .frame(height: 6)

                            HStack {
                                Text("已花費 $\(Int(entry.monthExpense))")
                                    .font(.system(size: 9))
                                    .foregroundColor(.gray)
                                Spacer()
                                Text("預算 $\(Int(entry.monthBudget))")
                                    .font(.system(size: 9))
                                    .foregroundColor(.gray)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }
                }
                .padding(14)
            }
        }
        .widgetURL(URL(string: "zhizhangkun://overview"))
    }
}

public struct BudgetWidget: Widget {
    public let kind: String = "BudgetWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BudgetProvider()) { entry in
            BudgetWidgetView(entry: entry)
        }
        .configurationDisplayName("今日支出與預算")
        .description("即時掌握今日花費、本月累積支出與剩餘可用預算。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
