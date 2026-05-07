# Azzay Pharmacy NEXUS v2.0 — Complete Redesign

## 🎨 Design Philosophy

**Medical-Grade Pharmaceutical Intelligence System**

The redesign transforms Azzay Pharmacy into a cutting-edge, AI-powered pharmaceutical management platform with:

- **Pharmaceutical 3D Visualization**: DNA helix and molecular structures representing the medical/pharmaceutical domain
- **Glassmorphism UI**: Modern, translucent cards with backdrop blur for depth
- **Dual Theme System**: Professionally designed light and dark modes
- **Medical Color Palette**: Cyan (#00D9FF), Purple (#A78BFA), Green (#10B981) for dark mode; Sky Blue (#0EA5E9), Violet (#8B5CF6) for light mode
- **Gradient Backgrounds**: Smooth, professional gradients instead of flat colors
- **Micro-interactions**: Hover states, transitions, and animations throughout

---

## 🚀 What's New

### 1. **Login Page** (`/`)
- **3D Scene**: Animated DNA double helix with floating molecular structures
- **Glassmorphic Card**: Translucent login panel with backdrop blur
- **Theme-Aware**: Completely different 3D scenes for light/dark modes
- **Glow Effects**: Radial gradients and shadows for depth
- **Status Indicator**: Live "NEXUS v2.0 Online" badge with pulse animation
- **Hydration Fix**: Proper `mounted` guard to prevent SSR/client mismatch

**Dark Mode**: Deep space (#0A0E1A) with glowing cyan/purple molecules
**Light Mode**: Sky blue (#F0F9FF) with vibrant teal/indigo molecules

---

### 2. **Dashboard Layout** (`/dashboard/layout.tsx`)

#### **Collapsible Sidebar**
- **Width**: 280px expanded, 80px collapsed
- **Sections**:
  - **Main Navigation**: Overview, POS, Inventory, Analytics, AI Assistant, Prescriptions, Staff
  - **Administration** (ROOT/OWNER only): Organization, Branches, Financials, Reports, System, Security
  - **System**: Settings
- **Features**:
  - Icon-only mode when collapsed
  - Color-coded icons per route
  - Active state with glow effect
  - Expandable admin section
  - User card with theme toggle and sign out

#### **Top Bar**
- Current page title
- Branch indicator with live status pulse
- Date display

#### **Design**:
- Glassmorphic panels with backdrop blur
- Smooth transitions on collapse/expand
- Gradient borders
- Theme-aware colors throughout

---

### 3. **Pages Redesigned**

#### **Dashboard Overview** (`/dashboard/page.tsx`)
- Stat cards with live data indicators
- Quick action grid
- Recent activity feed
- All using the new glassmorphic design system

#### **Point of Sale** (`/dashboard/pos/page.tsx`)
- Product grid with search
- Live cart with item management
- Payment method selector (Cash, Momo, Card)
- Transaction completion flow

#### **Inventory** (`/dashboard/inventory/page.tsx`)
- Stock level indicators
- Product table with search/filter
- Low stock alerts
- Category badges

#### **Analytics** (`/dashboard/analytics/page.tsx`)
- Revenue trend bar chart
- KPI cards with trend indicators
- Top products table
- Payment method breakdown
- Best day statistics

#### **AI Assistant** (`/dashboard/ai/page.tsx`)
- Chat interface with message bubbles
- Quick action buttons (Drug Interaction, Sales Forecast, Reorder, Prescription Analysis)
- Typing indicator
- Simulated Gemini responses (ready for API integration)

#### **Prescriptions** (`/dashboard/prescriptions/page.tsx`) — **NEW**
- Rx number tracking
- Patient and doctor information
- Status badges (Pending, Partial, Dispensed, Expired)
- Scan Rx button for camera integration
- AI verification indicator

#### **Staff** (`/dashboard/staff/page.tsx`)
- Staff list with role badges
- Active/inactive status
- Search and filter
- Last login tracking

#### **Settings** (`/dashboard/settings/page.tsx`)
- Theme selector (Light, Dark, System)
- Organization settings placeholder
- Security settings placeholder

---

### 4. **Admin Section** — **NEW**

#### **Organization** (`/dashboard/admin/organization/page.tsx`)
- Organization name, country, currency
- Tax ID (GRA TIN)
- Contact information (email, phone, address)
- Save functionality
- Admin-only access warning

#### **Branches** (Placeholder)
- Multi-branch management
- Branch type (Licensed Pharmacy vs Chemical Shop)
- License tracking

#### **Financials** (Placeholder)
- Expense tracking
- Ledger entries
- Revenue/expense reports

#### **Reports** (Placeholder)
- Sales reports
- Inventory reports
- Financial statements

#### **System** (Placeholder)
- Database management
- Backup/restore
- System logs

#### **Security** (Placeholder)
- Audit logs
- User permissions
- API keys

---

## 🎨 Design System

### **Colors**

#### Dark Mode
- **Background**: `#0A0E1A` → `#1A1F35` (gradient)
- **Primary**: `#00D9FF` (Cyan)
- **Secondary**: `#A78BFA` (Purple)
- **Success**: `#34D399` (Green)
- **Warning**: `#FBBF24` (Amber)
- **Danger**: `#EF4444` (Red)
- **Text Primary**: `#F8FAFC`
- **Text Secondary**: `#94A3B8`
- **Text Muted**: `#64748B`

#### Light Mode
- **Background**: `#F0F9FF` → `#E0F2FE` (gradient)
- **Primary**: `#0EA5E9` (Sky Blue)
- **Secondary**: `#8B5CF6` (Violet)
- **Success**: `#10B981` (Emerald)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#EF4444` (Red)
- **Text Primary**: `#0F172A`
- **Text Secondary**: `#64748B`
- **Text Muted**: `#94A3B8`

### **Typography**
- **Display**: Syne (headings, titles)
- **UI**: DM Sans (body, labels, buttons)
- **Data**: DM Mono (numbers, codes, timestamps)

### **Components**

#### **Glassmorphic Card**
```tsx
background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)'
backdrop-filter: blur(20px)
border: 1px solid rgba(...)
box-shadow: ...
```

#### **Button (Primary)**
```tsx
background: linear-gradient(135deg, #00D9FF 0%, #00A3CC 100%) // dark
background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%) // light
box-shadow: 0 10px 30px rgba(...)
```

#### **Input Field**
```tsx
background: rgba(15, 23, 42, 0.5) // dark
background: rgba(255, 255, 255, 0.8) // light
border: 1px solid rgba(...)
focus: border-color + ring shadow
```

---

## 📊 Database Schema (from Supabase)

The system is built on a comprehensive Prisma schema with:

- **Organisation & Branch**: Multi-branch support
- **User & StaffProfile**: Role-based access (ROOT, OWNER, MANAGER, PHARMACIST, TECHNICIAN, CASHIER)
- **Product & StockItem**: Full inventory management with batch tracking
- **Sale & SaleItem**: POS transactions with NHIS support
- **Prescription & RxItem**: Prescription management with AI extraction
- **Supplier & Purchase**: Procurement tracking
- **Invoice**: Sales and purchase invoicing
- **Expense & LedgerEntry**: Financial accounting
- **StockAlert**: Automated inventory alerts
- **AiInsight**: Gemini-powered analytics
- **AuditLog**: Full audit trail

---

## 🔧 Technical Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **React**: 19.2.4
- **3D**: Three.js via @react-three/fiber, @react-three/drei
- **Styling**: Tailwind CSS v4 with custom theme
- **Icons**: Lucide React
- **Auth**: Supabase Auth
- **Theme**: next-themes
- **Backend**: NestJS + GraphQL + Prisma (separate API)
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini (configured, ready for integration)

---

## 🚦 Build Status

✅ **All routes compile successfully**
✅ **Zero TypeScript errors**
✅ **Zero hydration warnings**
✅ **12 static routes generated**

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /dashboard
├ ○ /dashboard/admin/organization
├ ○ /dashboard/ai
├ ○ /dashboard/analytics
├ ○ /dashboard/inventory
├ ○ /dashboard/pos
├ ○ /dashboard/prescriptions
├ ○ /dashboard/settings
└ ○ /dashboard/staff
```

---

## 🎯 Next Steps

### **Immediate**
1. Create remaining admin pages (Branches, Financials, Reports, System, Security)
2. Connect AI Assistant to real Gemini API
3. Implement prescription scanning with camera
4. Add real-time data fetching from NestJS backend

### **Backend Integration**
1. Connect GraphQL queries to dashboard pages
2. Implement POS transaction flow
3. Add inventory management CRUD
4. Set up prescription dispensing workflow

### **Advanced Features**
1. Real-time notifications (stock alerts, low inventory)
2. Offline mode with service workers
3. Receipt printing
4. Barcode scanning
5. Multi-language support (English, Twi, French)
6. Mobile app (Tauri is already configured)

---

## 📝 Notes

- **Theme System**: Uses `next-themes` with proper SSR handling via `mounted` guard
- **Responsive**: All pages are mobile-responsive
- **Accessibility**: Semantic HTML, proper ARIA labels, keyboard navigation
- **Performance**: Static generation where possible, lazy loading for 3D components
- **Security**: Role-based access control, admin routes protected

---

## 🎨 Design Inspiration

The redesign draws from:
- **Medical/Pharmaceutical**: DNA helix, molecular structures, clinical color palette
- **Modern SaaS**: Glassmorphism, gradients, micro-interactions
- **Data Dashboards**: Clear hierarchy, scannable layouts, data visualization
- **AI Products**: Conversational UI, quick actions, intelligent suggestions

---

**Built with ❤️ for Azzay Pharmacy**
*AI-Native Pharmaceutical Intelligence • NEXUS v2.0*
