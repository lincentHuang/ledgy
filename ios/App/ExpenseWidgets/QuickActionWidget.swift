import WidgetKit
import SwiftUI

struct ActionEntry: TimelineEntry {
    let date: Date
}

struct ActionProvider: TimelineProvider {
    func placeholder(in context: Context) -> ActionEntry {
        ActionEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (ActionEntry) -> Void) {
        completion(ActionEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ActionEntry>) -> Void) {
        let entry = ActionEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct QuickActionWidgetView: View {
    var entry: ActionEntry

    var body: some View {
        ZStack {
            Color(red: 3/255, green: 7/255, blue: 18/255) // #030712

            VStack(spacing: 10) {
                // Top Header
                HStack {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                            .frame(width: 6, height: 6)
                        Text("快速記帳捷徑")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Text("智帳君 AI")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)
                }

                // 3 Action Buttons with Deep Links
                HStack(spacing: 8) {
                    // 1. 🎙️ 語音記帳
                    Link(destination: URL(string: "zhizhangkun://voice")!) {
                        VStack(spacing: 6) {
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [Color(red: 16/255, green: 185/255, blue: 129/255), Color(red: 20/255, green: 184/255, blue: 166/255)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 38, height: 38)
                                    .shadow(color: Color(red: 16/255, green: 185/255, blue: 129/255).opacity(0.3), radius: 4)

                                Image(systemName: "mic.fill")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            Text("語音記帳")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }

                    // 2. 📷 掃描發票
                    Link(destination: URL(string: "zhizhangkun://scanner")!) {
                        VStack(spacing: 6) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 99/255, green: 102/255, blue: 241/255))
                                    .frame(width: 38, height: 38)
                                    .shadow(color: Color(red: 99/255, green: 102/255, blue: 241/255).opacity(0.3), radius: 4)

                                Image(systemName: "qrcode.viewfinder")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            Text("掃描發票")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }

                    // 3. ➕ 手動記帳
                    Link(destination: URL(string: "zhizhangkun://quick-input")!) {
                        VStack(spacing: 6) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 234/255, green: 179/255, blue: 8/255))
                                    .frame(width: 38, height: 38)
                                    .shadow(color: Color(red: 234/255, green: 179/255, blue: 8/255).opacity(0.3), radius: 4)

                                Image(systemName: "plus")
                                    .font(.system(size: 17, weight: .heavy))
                                    .foregroundColor(.slate950)
                            }

                            Text("手動記帳")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }
                }
            }
            .padding(14)
        }
    }
}

extension Color {
    static let slate950 = Color(red: 2/255, green: 6/255, blue: 23/255)
}

public struct QuickActionWidget: Widget {
    public let kind: String = "QuickActionWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ActionProvider()) { entry in
            QuickActionWidgetView(entry: entry)
        }
        .configurationDisplayName("快速動作捷徑")
        .description("在手機桌面提供一鍵語音記帳、掃描發票與手動記帳快捷按鈕。")
        .supportedFamilies([.systemMedium])
    }
}
