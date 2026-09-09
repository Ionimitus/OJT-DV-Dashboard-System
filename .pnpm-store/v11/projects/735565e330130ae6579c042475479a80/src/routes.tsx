import { createHashRouter, Navigate } from "react-router";
import Root, {
  DashboardPage,
  VouchersPage,
  VoucherDetailPage,
  PaymentExposurePage,
  OverdueVouchersPage,
  UnpaidByAreaPage,
  PaymentRegisterPage,
  TradeAreasPage,
  SettingsPage,
} from "./App";

export const router = createHashRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard",    Component: DashboardPage },
      { path: "vouchers",     Component: VouchersPage },
      { path: "trade-areas",  Component: TradeAreasPage },
      { path: "settings",     Component: SettingsPage },
      { path: "reports",      element: <Navigate to="/reports/exposure" replace /> },
      { path: "reports/exposure", Component: PaymentExposurePage },
      { path: "reports/overdue",  Component: OverdueVouchersPage },
      { path: "reports/by-area",  Component: UnpaidByAreaPage },
      { path: "reports/register", Component: PaymentRegisterPage },
    ],
  },
  { path: "vouchers/:id", Component: VoucherDetailPage },
]);
