import WidgetKit
import SwiftUI
import CoreImage.CIFilterBuiltins

struct BarcodeEntry: TimelineEntry {
    let date: Date
    let carrierCode: String
}

struct BarcodeProvider: TimelineProvider {
    func placeholder(in context: Context) -> BarcodeEntry {
        BarcodeEntry(date: Date(), carrierCode: "/AB1234+")
    }

    func getSnapshot(in context: Context, completion: @escaping (BarcodeEntry) -> Void) {
        let data = WidgetSharedData.get()
        completion(BarcodeEntry(date: Date(), carrierCode: data.carrierCode))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BarcodeEntry>) -> Void) {
        let data = WidgetSharedData.get()
        let entry = BarcodeEntry(date: Date(), carrierCode: data.carrierCode)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// 產生 Code 128 高對比清晰條碼
func generateBarcodeImage(from string: String) -> UIImage? {
    let context = CIContext()
    let filter = CIFilter.code128BarcodeGenerator()
    filter.message = Data(string.utf8)
    filter.quietSpace = 7.0

    guard let outputImage = filter.outputImage else { return nil }

    // 放大條碼至高解析度（避免模糊）
    let scaleX: CGFloat = 8.0
    let scaleY: CGFloat = 8.0
    let transformedImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))

    if let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) {
        return UIImage(cgImage: cgImage)
    }
    return nil
}

struct BarcodeWidgetView: View {
    var entry: BarcodeEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            Color(red: 3/255, green: 7/255, blue: 18/255) // #030712 Dark slate background

            VStack(spacing: 8) {
                // Header Tag
                HStack {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                            .frame(width: 6, height: 6)
                        Text("手機條碼載具")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(red: 6/255, green: 78/255, blue: 59/255).opacity(0.4))
                    .cornerRadius(8)

                    Spacer()

                    Text("智帳君")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)
                }

                // Barcode Container (White card for high scanner contrast)
                VStack(spacing: 4) {
                    if let img = generateBarcodeImage(from: entry.carrierCode) {
                        Image(uiImage: img)
                            .resizable()
                            .interpolation(.none)
                            .scaledToFit()
                            .frame(maxHeight: family == .systemMedium ? 56 : 38)
                            .padding(.horizontal, 4)
                            .padding(.top, 4)
                    }

                    Text(entry.carrierCode)
                        .font(.system(size: family == .systemMedium ? 15 : 12, weight: .heavy, design: .monospaced))
                        .foregroundColor(.black)
                        .padding(.bottom, 3)
                }
                .frame(maxWidth: .infinity)
                .background(Color.white)
                .cornerRadius(10)
                .shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 2)

                if family == .systemMedium {
                    HStack {
                        Text("結帳直接出示供店員掃描")
                            .font(.system(size: 10))
                            .foregroundColor(Color.gray)
                        Spacer()
                        Text("點擊放大 ›")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                    }
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: "zhizhangkun://barcode"))
    }
}

public struct BarcodeWidget: Widget {
    public let kind: String = "BarcodeWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BarcodeProvider()) { entry in
            BarcodeWidgetView(entry: entry)
        }
        .configurationDisplayName("手機條碼載具")
        .description("在手機桌面直接顯示電子發票載具條碼，超商結帳不用開 App！")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
