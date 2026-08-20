package com.zhizhangkun.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.widget.RemoteViews;

public class BarcodeWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "WidgetPrefs";
    public static final String KEY_CARRIER_CODE = "carrierCode";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String carrierCode = prefs.getString(KEY_CARRIER_CODE, "/AB1234+");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_barcode);
        views.setTextViewText(R.id.widget_carrier_code_text, carrierCode);

        // 生成條碼 Bitmap
        try {
            Bitmap barcodeBmp = BarcodeGenerator.generateCode39(carrierCode, 320, 100);
            views.setImageViewBitmap(R.id.widget_barcode_img, barcodeBmp);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 點擊開啟 App
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_barcode_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, BarcodeWidgetProvider.class));
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
