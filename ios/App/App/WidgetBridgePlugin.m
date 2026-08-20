#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
    CAP_PLUGIN_METHOD(syncWidgetData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadWidgets, CAPPluginReturnPromise);
)
