import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CashFlow() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const summaryCards = [
    {
      title: "Cash Inflow",
      value: "0.00",
      change: "+0%",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Cash Outflow",
      value: "0.00",
      change: "-0%",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950"
    },
    {
      title: "Net Cash Flow",
      value: "0.00",
      change: "0%",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Cash Flow
          </h1>
          <p className="text-muted-foreground mt-2">Monitor your cash flow and liquidity</p>
        </div>
        <div className="flex gap-2 items-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className={`text-xs ${card.color}`}>
                {card.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-medium">Operating Activities</p>
                <p className="text-sm text-muted-foreground">Revenue and expenses</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">+0.00</p>
                <p className="text-xs text-muted-foreground">0 transactions</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-medium">Investing Activities</p>
                <p className="text-sm text-muted-foreground">Assets and investments</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">-0.00</p>
                <p className="text-xs text-muted-foreground">0 transactions</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-medium">Financing Activities</p>
                <p className="text-sm text-muted-foreground">Loans and equity</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">0.00</p>
                <p className="text-xs text-muted-foreground">0 transactions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Cash flow chart will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}