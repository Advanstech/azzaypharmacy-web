'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  FileText, Download, BarChart3, Package, DollarSign, Users, Calendar, 
  ChevronRight, TrendingUp, AlertTriangle, Eye, ArrowRight, Activity,
  ShoppingCart, Boxes, CreditCard, Receipt, PiggyBank, Clock, CalendarDays,
  TrendingDown, PackageCheck, UserCircle, Store, Percent
} from 'lucide-react';

const CATEGORIES = ['All', 'Sales', 'Inventory', 'Staff', 'Financial', 'Customers', 'Suppliers'];

function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map(r => r.map(c => {
    if (c == null) return '""';
    const str = String(c).replace(/"/g, '""');
    return `"${str}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, products, staff, customers, suppliers, expenses, purchases, prescriptions } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [generating, setGenerating] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Computed report summaries
  const todaySales = useMemo(() => sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === today), [sales, today]);
  const todayRevenue = useMemo(() => todaySales.reduce((sum, s) => sum + s.totalAmount, 0), [todaySales]);
  
  const monthlySales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [sales]);
  const monthlyRevenue = useMemo(() => monthlySales.reduce((sum, s) => sum + s.totalAmount, 0), [monthlySales]);

  const lowStock = useMemo(() => products.filter(p => p.stockQuantity <= 10 && p.stockQuantity > 0), [products]);
  const outOfStock = useMemo(() => products.filter(p => p.stockQuantity === 0), [products]);
  const expiringItems = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return products.filter(p => {
      return p.stockItems?.some(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry <= thirtyDaysFromNow && expiry >= new Date() && item.quantity > 0;
      });
    });
  }, [products]);
  
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const totalCogs = useMemo(() => {
    return sales.reduce((sum, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product.id);
        const cost = product ? product.costPrice : (item.unitPrice * 0.5);
        return itemSum + (cost * item.quantity);
      }, 0);
      return sum + saleCogs;
    }, 0);
  }, [sales, products]);
  
  const approvedExpenses = useMemo(() => expenses.filter(e => e.status === 'APPROVED'), [expenses]);
  const totalOperatingExpenses = useMemo(() => approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0), [approvedExpenses]);
  
  const netProfit = totalRevenue - totalCogs - totalOperatingExpenses;
  const grossProfit = totalRevenue - totalCogs;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';
  
  // Staff metrics
  const staffOnDuty = useMemo(() => staff.filter(s => s.isOnDuty), [staff]);
  const activeStaff = useMemo(() => staff.filter(s => s.isActive), [staff]);
  
  // Customer metrics  
  const totalCustomers = customers.length;
  const newCustomersThisMonth = useMemo(() => {
    const now = new Date();
    return customers.filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [customers]);
  
  // Supplier metrics
  const activeSuppliers = suppliers.length;
  const pendingPurchases = useMemo(() => purchases.filter(p => p.status === 'PENDING'), [purchases]);

  const REPORTS = [
    // SALES REPORTS
    {
      id: 'sales-daily',
      title: 'Daily Sales Report',
      desc: `${todaySales.length} transactions · GH₵ ${todayRevenue.toFixed(2)} today`,
      icon: BarChart3, color: '#0EA5E9', category: 'Sales',
      lastGenerated: today,
      detailPath: '/admin/reports/sales/daily',
      onExport: () => {
        const rows = [
          ['Sale ID', 'Customer', 'Items', 'Payment', 'Amount', 'Profit', 'Time'],
          ...todaySales.map(s => {
            const saleCogs = s.items.reduce((sum, item) => {
              const product = products.find(p => p.id === item.product.id);
              const cost = product ? product.costPrice : (item.unitPrice * 0.5);
              return sum + (cost * item.quantity);
            }, 0);
            return [
              s.id, s.customerName || 'Walk-in',
              String(s.items.length), s.paymentMethod,
              s.totalAmount.toFixed(2),
              (s.totalAmount - saleCogs).toFixed(2),
              new Date(s.createdAt).toLocaleTimeString('en-GB'),
            ];
          }),
        ];
        downloadCSV(`daily-sales-${today}.csv`, rows);
      },
    },
    {
      id: 'sales-monthly',
      title: 'Monthly Revenue Summary',
      desc: `${monthlySales.length} transactions · GH₵ ${monthlyRevenue.toFixed(2)} this month`,
      icon: DollarSign, color: '#10B981', category: 'Sales',
      lastGenerated: today,
      detailPath: '/admin/reports/sales/monthly',
      onExport: () => {
        const byMethod: Record<string, { amount: number; count: number; cogs: number }> = {};
        monthlySales.forEach(s => {
          const saleCogs = s.items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.product.id);
            const cost = product ? product.costPrice : (item.unitPrice * 0.5);
            return sum + (cost * item.quantity);
          }, 0);
          if (!byMethod[s.paymentMethod]) byMethod[s.paymentMethod] = { amount: 0, count: 0, cogs: 0 };
          byMethod[s.paymentMethod].amount += s.totalAmount;
          byMethod[s.paymentMethod].count += 1;
          byMethod[s.paymentMethod].cogs += saleCogs;
        });
        const rows = [
          ['Payment Method', 'Revenue', 'COGS', 'Profit', 'Transactions', 'Avg Sale'],
          ...Object.entries(byMethod).map(([m, data]) => [
            m, data.amount.toFixed(2), data.cogs.toFixed(2),
            (data.amount - data.cogs).toFixed(2),
            String(data.count),
            (data.amount / data.count).toFixed(2),
          ]),
          ['TOTAL', monthlyRevenue.toFixed(2), 
           monthlySales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => {
             const product = products.find(p => p.id === item.product.id);
             return itemSum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
           }, 0), 0).toFixed(2),
           (monthlyRevenue - monthlySales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => {
             const product = products.find(p => p.id === item.product.id);
             return itemSum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
           }, 0), 0)).toFixed(2),
           String(monthlySales.length),
           monthlySales.length > 0 ? (monthlyRevenue / monthlySales.length).toFixed(2) : '0.00'],
        ];
        downloadCSV(`monthly-revenue-${today}.csv`, rows);
      },
    },
    {
      id: 'sales-by-product',
      title: 'Sales by Product',
      desc: 'Top selling products with revenue and profit analysis',
      icon: ShoppingCart, color: '#6366F1', category: 'Sales',
      lastGenerated: today,
      detailPath: '/admin/reports/sales/by-product',
      onExport: () => {
        const productSales: Record<string, { name: string; category: string; qty: number; revenue: number; cogs: number }> = {};
        sales.forEach(s => {
          s.items.forEach(item => {
            const product = products.find(p => p.id === item.product.id);
            if (!productSales[item.product.id]) {
              productSales[item.product.id] = { name: item.product.name, category: item.product.category, qty: 0, revenue: 0, cogs: 0 };
            }
            productSales[item.product.id].qty += item.quantity;
            productSales[item.product.id].revenue += item.total;
            productSales[item.product.id].cogs += (product ? product.costPrice : item.unitPrice * 0.5) * item.quantity;
          });
        });
        const sorted = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue);
        const rows = [
          ['Product', 'Category', 'Qty Sold', 'Revenue', 'COGS', 'Profit', 'Margin %'],
          ...sorted.map(([, data]) => [
            data.name, data.category, String(data.qty),
            data.revenue.toFixed(2), data.cogs.toFixed(2),
            (data.revenue - data.cogs).toFixed(2),
            data.revenue > 0 ? (((data.revenue - data.cogs) / data.revenue) * 100).toFixed(1) : '0',
          ]),
        ];
        downloadCSV(`sales-by-product-${today}.csv`, rows);
      },
    },
    // INVENTORY REPORTS
    {
      id: 'inventory-stock',
      title: 'Stock Level Report',
      desc: `${products.length} products · ${lowStock.length} low · ${outOfStock.length} out of stock`,
      icon: Package, color: '#F59E0B', category: 'Inventory',
      lastGenerated: today,
      detailPath: '/admin/reports/inventory/stock',
      onExport: () => {
        const rows = [
          ['Product', 'Category', 'Dosage Form', 'Stock Qty', 'Cost Price', 'Sell Price', 'Stock Value', 'Status'],
          ...products.map(p => [
            p.name, p.category, p.dosageForm || 'N/A',
            String(p.stockQuantity),
            p.costPrice.toFixed(2), p.sellingPrice.toFixed(2),
            (p.costPrice * p.stockQuantity).toFixed(2),
            p.stockQuantity === 0 ? 'OUT OF STOCK' : p.stockQuantity <= 10 ? 'LOW STOCK' : 'OK',
          ]),
        ];
        downloadCSV(`stock-levels-${today}.csv`, rows);
      },
    },
    {
      id: 'inventory-expiry',
      title: 'Expiry Tracking Report',
      desc: `${expiringItems.length} items expiring soon · ${outOfStock.length} out of stock`,
      icon: Calendar, color: '#EF4444', category: 'Inventory',
      lastGenerated: today,
      detailPath: '/admin/reports/inventory/expiry',
      onExport: () => {
        const expiryData: Array<{product: string; category: string; batch: string; expiry: string; qty: number; daysLeft: number}> = [];
        products.forEach(p => {
          p.stockItems?.forEach(item => {
            if (item.expiryDate && item.quantity > 0) {
              const expiry = new Date(item.expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 90) {
                expiryData.push({
                  product: p.name,
                  category: p.category,
                  batch: item.batchNo || 'N/A',
                  expiry: item.expiryDate,
                  qty: item.quantity,
                  daysLeft,
                });
              }
            }
          });
        });
        expiryData.sort((a, b) => a.daysLeft - b.daysLeft);
        const rows = [
          ['Product', 'Category', 'Batch No', 'Expiry Date', 'Quantity', 'Days Left', 'Status'],
          ...expiryData.map(d => [
            d.product, d.category, d.batch, d.expiry,
            String(d.qty), String(d.daysLeft),
            d.daysLeft <= 0 ? 'EXPIRED' : d.daysLeft <= 30 ? 'CRITICAL' : d.daysLeft <= 60 ? 'WARNING' : 'ATTENTION',
          ]),
        ];
        downloadCSV(`expiry-tracking-${today}.csv`, rows);
      },
    },
    {
      id: 'inventory-valuation',
      title: 'Inventory Valuation',
      desc: 'Complete stock valuation with cost and retail values',
      icon: Boxes, color: '#14B8A6', category: 'Inventory',
      lastGenerated: today,
      detailPath: '/admin/reports/inventory/valuation',
      onExport: () => {
        const totalCost = products.reduce((sum, p) => sum + (p.costPrice * p.stockQuantity), 0);
        const totalRetail = products.reduce((sum, p) => sum + (p.sellingPrice * p.stockQuantity), 0);
        const rows = [
          ['Product', 'Category', 'Qty', 'Unit Cost', 'Total Cost', 'Unit Price', 'Total Retail', 'Potential Profit'],
          ...products.filter(p => p.stockQuantity > 0).map(p => [
            p.name, p.category, String(p.stockQuantity),
            p.costPrice.toFixed(2), (p.costPrice * p.stockQuantity).toFixed(2),
            p.sellingPrice.toFixed(2), (p.sellingPrice * p.stockQuantity).toFixed(2),
            ((p.sellingPrice - p.costPrice) * p.stockQuantity).toFixed(2),
          ]),
          ['TOTAL', '', String(products.reduce((sum, p) => sum + p.stockQuantity, 0)),
           '', totalCost.toFixed(2), '', totalRetail.toFixed(2), (totalRetail - totalCost).toFixed(2)],
        ];
        downloadCSV(`inventory-valuation-${today}.csv`, rows);
      },
    },
    // STAFF REPORTS
    {
      id: 'staff-performance',
      title: 'Staff Performance Report',
      desc: `${activeStaff.length} active staff · ${staffOnDuty.length} on duty now`,
      icon: Users, color: '#8B5CF6', category: 'Staff',
      lastGenerated: today,
      detailPath: '/admin/reports/staff/performance',
      onExport: () => {
        const staffSales: Record<string, { name: string; sales: number; revenue: number; items: number }> = {};
        sales.forEach(s => {
          if (s.cashierId) {
            if (!staffSales[s.cashierId]) {
              const staffMember = staff.find(st => st.id === s.cashierId);
              staffSales[s.cashierId] = { name: staffMember?.name || s.user?.name || 'Unknown', sales: 0, revenue: 0, items: 0 };
            }
            staffSales[s.cashierId].sales += 1;
            staffSales[s.cashierId].revenue += s.totalAmount;
            staffSales[s.cashierId].items += s.items.reduce((sum, i) => sum + i.quantity, 0);
          }
        });
        const rows = [
          ['Name', 'Role', 'Branch', 'Status', 'Total Sales', 'Revenue', 'Items Sold', 'Avg Sale'],
          ...staff.map(s => {
            const perf = staffSales[s.id] || { sales: 0, revenue: 0, items: 0 };
            return [
              s.name, s.role, s.branch?.name || 'N/A',
              s.isOnDuty ? 'On Duty' : s.isActive ? 'Active' : 'Inactive',
              String(perf.sales), perf.revenue.toFixed(2), String(perf.items),
              perf.sales > 0 ? (perf.revenue / perf.sales).toFixed(2) : '0.00',
            ];
          }),
        ];
        downloadCSV(`staff-performance-${today}.csv`, rows);
      },
    },
    {
      id: 'staff-attendance',
      title: 'Staff Attendance Log',
      desc: 'Complete duty status and attendance tracking',
      icon: Clock, color: '#06B6D4', category: 'Staff',
      lastGenerated: today,
      detailPath: '/admin/reports/staff/attendance',
      onExport: () => {
        const rows = [
          ['Name', 'Email', 'Role', 'Branch', 'On Duty', 'Last Seen', 'Active', 'Phone'],
          ...staff.map(s => [
            s.name, s.email, s.role,
            s.branch?.name || 'N/A',
            s.isOnDuty ? 'Yes' : 'No',
            s.lastSeen ? new Date(s.lastSeen).toLocaleString('en-GB') : 'Never',
            s.isActive ? 'Yes' : 'No',
            s.phone || 'N/A',
          ]),
        ];
        downloadCSV(`staff-attendance-${today}.csv`, rows);
      },
    },
    // FINANCIAL REPORTS
    {
      id: 'financial-pl',
      title: 'Profit & Loss Statement',
      desc: `Revenue GH₵ ${totalRevenue.toFixed(2)} · Net GH₵ ${netProfit.toFixed(2)} · Margin ${profitMargin}%`,
      icon: FileText, color: '#EC4899', category: 'Financial',
      lastGenerated: today,
      detailPath: '/admin/reports/financial/pnl',
      onExport: () => {
        const rows = [
          ['Account', 'Amount (GH₵)', 'Notes'],
          ['TOTAL REVENUE', totalRevenue.toFixed(2), 'All sales transactions'],
          ['', '', ''],
          ['COST OF GOODS SOLD', '', ''],
          ['  Product Costs', totalCogs.toFixed(2), 'Based on cost prices'],
          ['GROSS PROFIT', grossProfit.toFixed(2), 'Revenue - COGS'],
          ['GROSS MARGIN %', totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%', ''],
          ['', '', ''],
          ['OPERATING EXPENSES', '', ''],
          ...approvedExpenses.map(e => [`  ${e.category || 'Other'}`, Number(e.amount).toFixed(2), e.description || '']),
          ['  TOTAL EXPENSES', totalOperatingExpenses.toFixed(2), ''],
          ['', '', ''],
          ['NET PROFIT', netProfit.toFixed(2), 'Gross Profit - Expenses'],
          ['NET MARGIN %', totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%', ''],
        ];
        downloadCSV(`profit-loss-${today}.csv`, rows);
      },
    },
    {
      id: 'financial-expenses',
      title: 'Expense Report',
      desc: `${approvedExpenses.length} expenses · GH₵ ${totalOperatingExpenses.toFixed(2)} total`,
      icon: Receipt, color: '#F97316', category: 'Financial',
      lastGenerated: today,
      detailPath: '/admin/reports/financial/expenses',
      onExport: () => {
        const byCategory: Record<string, number> = {};
        approvedExpenses.forEach(e => {
          const cat = String(e.category || 'Uncategorized');
          byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
        });
        const rows = [
          ['Date', 'Category', 'Amount', 'Description', 'Status'],
          ...approvedExpenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(e => [
            new Date(e.createdAt).toLocaleDateString('en-GB'),
            String(e.category || 'Uncategorized'),
            Number(e.amount).toFixed(2),
            String(e.description || ''),
            String(e.status),
          ]),
          ['', '', '', '', ''],
          ['CATEGORY SUMMARY', '', '', '', ''],
          ...Object.entries(byCategory).map(([cat, amount]) => ['', String(cat), amount.toFixed(2), '', '']),
          ['', 'TOTAL', totalOperatingExpenses.toFixed(2), '', ''],
        ];
        downloadCSV(`expense-report-${today}.csv`, rows);
      },
    },
    // CUSTOMER REPORTS
    {
      id: 'customers-analysis',
      title: 'Customer Analysis',
      desc: `${totalCustomers} total · ${newCustomersThisMonth} new this month`,
      icon: UserCircle, color: '#84CC16', category: 'Customers',
      lastGenerated: today,
      detailPath: '/admin/reports/customers/analysis',
      onExport: () => {
        const customerData: Record<string, { name: string; phone: string; visits: number; spent: number; lastVisit: string }> = {};
        sales.forEach(s => {
          const key = s.customerPhone || s.customerName || 'Walk-in';
          if (!customerData[key]) {
            customerData[key] = { name: s.customerName || 'Walk-in', phone: s.customerPhone || 'N/A', visits: 0, spent: 0, lastVisit: s.createdAt };
          }
          customerData[key].visits += 1;
          customerData[key].spent += s.totalAmount;
          if (new Date(s.createdAt) > new Date(customerData[key].lastVisit)) {
            customerData[key].lastVisit = s.createdAt;
          }
        });
        const sorted = Object.entries(customerData).sort((a, b) => b[1].spent - a[1].spent);
        const rows = [
          ['Customer', 'Phone', 'Visits', 'Total Spent', 'Avg Sale', 'Last Visit'],
          ...sorted.map(([, data]) => [
            data.name, data.phone, String(data.visits),
            data.spent.toFixed(2),
            (data.spent / data.visits).toFixed(2),
            new Date(data.lastVisit).toLocaleDateString('en-GB'),
          ]),
        ];
        downloadCSV(`customer-analysis-${today}.csv`, rows);
      },
    },
    // SUPPLIER REPORTS
    {
      id: 'suppliers-performance',
      title: 'Supplier Performance',
      desc: `${activeSuppliers} suppliers · ${pendingPurchases.length} pending orders`,
      icon: Store, color: '#A855F7', category: 'Suppliers',
      lastGenerated: today,
      detailPath: '/admin/reports/suppliers/performance',
      onExport: () => {
        const supplierData: Record<string, { name: string; orders: number; totalValue: number; lastOrder: string }> = {};
        purchases.forEach(p => {
          if (p.supplier) {
            if (!supplierData[p.supplier.id]) {
              supplierData[p.supplier.id] = { name: p.supplier.name, orders: 0, totalValue: 0, lastOrder: p.invoiceDate };
            }
            supplierData[p.supplier.id].orders += 1;
            supplierData[p.supplier.id].totalValue += p.total;
            if (new Date(p.invoiceDate) > new Date(supplierData[p.supplier.id].lastOrder)) {
              supplierData[p.supplier.id].lastOrder = p.invoiceDate;
            }
          }
        });
        const rows = [
          ['Supplier', 'Contact', 'Categories', 'Total Orders', 'Total Value', 'Avg Order', 'Last Order'],
          ...suppliers.map(s => {
            const data = supplierData[s.id] || { orders: 0, totalValue: 0, lastOrder: 'N/A' };
            return [
              s.name, s.phone || s.email || 'N/A',
              s.categories?.join(', ') || 'N/A',
              String(data.orders), data.totalValue.toFixed(2),
              data.orders > 0 ? (data.totalValue / data.orders).toFixed(2) : '0.00',
              data.lastOrder !== 'N/A' ? new Date(data.lastOrder).toLocaleDateString('en-GB') : 'N/A',
            ];
          }),
        ];
        downloadCSV(`supplier-performance-${today}.csv`, rows);
      },
    },
    {
      id: 'purchase-orders',
      title: 'Purchase Orders Report',
      desc: `${purchases.length} orders · GH₵ ${purchases.reduce((sum, p) => sum + p.total, 0).toFixed(2)} total value`,
      icon: PackageCheck, color: '#22C55E', category: 'Suppliers',
      lastGenerated: today,
      detailPath: '/admin/reports/suppliers/purchase-orders',
      onExport: () => {
        const rows = [
          ['Invoice #', 'Date', 'Supplier', 'Status', 'Items', 'Total Value'],
          ...purchases.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()).map(p => [
            p.invoiceNo || 'N/A',
            new Date(p.invoiceDate).toLocaleDateString('en-GB'),
            p.supplier?.name || 'Unknown',
            p.status,
            String(p.items?.length || 0),
            p.total.toFixed(2),
          ]),
        ];
        downloadCSV(`purchase-orders-${today}.csv`, rows);
      },
    },
  ];

  const filtered = REPORTS.filter(r => activeCategory === 'All' || r.category === activeCategory);

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Reports</h1>
          <p className="text-sm" style={{ color: card.muted }}>Live data — export any report as CSV instantly.</p>
        </div>
        {/* Live summary strip */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Today Revenue', value: `GH₵ ${todaySales.reduce((s, x) => s + x.totalAmount, 0).toFixed(2)}`, color: '#10B981' },
            { label: 'Low Stock', value: String(lowStock.length), color: '#F59E0B' },
            { label: 'Staff On Duty', value: String(staff.filter(s => s.isOnDuty).length), color: '#0EA5E9' },
          ].map(k => (
            <div key={k.label} className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${k.color}15`, color: k.color, border: `1px solid ${k.color}30` }}>
              {k.label}: {k.value}
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeCategory === cat ? card.primaryBg : card.bg,
              color: activeCategory === cat ? card.primary : card.muted,
              border: `1px solid ${activeCategory === cat ? card.primaryBorder : card.border}`,
              boxShadow: activeCategory === cat ? 'none' : card.shadow,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(report => {
          const Icon = report.icon;
          const isGenerating = generating === report.id;
          return (
            <div key={report.id}
              className="rounded-2xl border backdrop-blur-xl p-5 transition-all hover:scale-[1.01] group flex flex-col"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ background: `${report.color}18`, color: report.color }}>
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: `${report.color}15`, color: report.color }}>
                  {report.category}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold mb-1" style={{ color: card.text }}>{report.title}</h3>
              <p className="text-xs mb-4 leading-relaxed flex-1" style={{ color: card.muted }}>{report.desc}</p>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => router.push(report.detailPath)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 hover:opacity-90"
                  style={{
                    background: `${report.color}15`,
                    color: report.color,
                    border: `1px solid ${report.color}30`,
                  }}>
                  <Eye size={13} />
                  View Details
                </button>
                <button
                  onClick={async () => {
                    setGenerating(report.id);
                    await new Promise(r => setTimeout(r, 400));
                    report.onExport();
                    setGenerating(null);
                  }}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: isGenerating ? `${report.color}30` : card.primaryBg,
                    color: isGenerating ? report.color : card.primary,
                    border: `1px solid ${card.primaryBorder}`,
                    opacity: isGenerating ? 0.7 : 1,
                  }}>
                  <Download size={13} />
                  {isGenerating ? 'Generating...' : 'Export CSV'}
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: card.border }}>
                <span className="text-[10px]" style={{ color: card.subtle }}>
                  Updated: {report.lastGenerated}
                </span>
                <ChevronRight size={14} style={{ color: card.subtle }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
