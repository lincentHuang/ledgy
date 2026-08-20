package com.zhizhangkun.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "WidgetPrefs";

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        JSObject data = call.getObject("data");
        if (data != null) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (data.has("carrierCode")) {
                editor.putString("carrierCode", data.optString("carrierCode", "/AB1234+"));
            }
            if (data.has("todayExpense")) {
                editor.putFloat("todayExpense", (float) data.optDouble("todayExpense", 0.0));
            }
            if (data.has("monthExpense")) {
                editor.putFloat("monthExpense", (float) data.optDouble("monthExpense", 0.0));
            }
            if (data.has("monthBudget")) {
                editor.putFloat("monthBudget", (float) data.optDouble("monthBudget", 35000.0));
            }
            if (data.has("budgetRemaining")) {
                editor.putFloat("budgetRemaining", (float) data.optDouble("budgetRemaining", 0.0));
            }
            if (data.has("activeLedgerName")) {
                editor.putString("activeLedgerName", data.optString("activeLedgerName", "個人帳本"));
            }
            editor.apply();

            // 即時通知所有桌面小工具刷新
            BarcodeWidgetProvider.updateAllWidgets(getContext());
            BudgetWidgetProvider.updateAllWidgets(getContext());
            QuickActionWidgetProvider.updateAllWidgets(getContext());
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void reloadWidgets(PluginCall call) {
        BarcodeWidgetProvider.updateAllWidgets(getContext());
        BudgetWidgetProvider.updateAllWidgets(getContext());
        QuickActionWidgetProvider.updateAllWidgets(getContext());

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
