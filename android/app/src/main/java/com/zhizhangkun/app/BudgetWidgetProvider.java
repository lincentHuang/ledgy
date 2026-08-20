package com.zhizhangkun.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.DecimalFormat;

public class BudgetWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "WidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        double monthExpense = prefs.getFloat("monthExpense", 0);
        double monthBudget = prefs.getFloat("monthBudget", 35000);
        double todayExpense = prefs.getFloat("todayExpense", 0);
        double remaining = monthBudget - monthExpense;

        DecimalFormat df = new DecimalFormat("#,###");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_budget);
        views.setTextViewText(R.id.widget_month_expense_text, "$ " + df.format((long) monthExpense));

        int progress = monthBudget > 0 ? (int) Math.min(Math.round((monthExpense / monthBudget) * 100), 100) : 0;
        views.setProgressBar(R.id.widget_budget_progress, 100, progress, false);

        if (remaining >= 0) {
            views.setTextViewText(R.id.widget_budget_remaining_text, "剩餘 $" + df.format((long) remaining));
        } else {
            views.setTextViewText(R.id.widget_budget_remaining_text, "已超支 $" + df.format((long) Math.abs(remaining)));
        }

        views.setTextViewText(R.id.widget_today_expense_text, "今日 $" + df.format((long) todayExpense));

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_budget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, BudgetWidgetProvider.class));
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
