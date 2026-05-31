/**
 * Azzay Pharmacy NEXUS — GraphQL Client
 * Authenticated requests using Supabase JWT
 */

import { getSessionSafe } from '@/lib/supabase';

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/graphql';
const API = typeof window !== 'undefined'
  ? RAW_API.replace('://localhost:', '://127.0.0.1:')
  : RAW_API;

function buildApiCandidates(apiUrl: string): string[] {
  const candidates = new Set<string>([apiUrl]);
  if (apiUrl.includes('://localhost:')) {
    candidates.add(apiUrl.replace('://localhost:', '://127.0.0.1:'));
  }
  if (apiUrl.includes('://127.0.0.1:')) {
    candidates.add(apiUrl.replace('://127.0.0.1:', '://localhost:'));
  }
  return Array.from(candidates);
}

function getApiRootUrl(apiUrl: string): string | null {
  try {
    const url = new URL(apiUrl);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function diagnoseApiReachability(apiUrl: string): Promise<string> {
  const rootUrl = getApiRootUrl(apiUrl);
  if (!rootUrl) return 'invalid API URL';

  try {
    const res = await fetch(rootUrl, { method: 'GET' });
    return `API root reachable (${res.status}) but GraphQL request failed`;
  } catch {
    return `API root unreachable (${rootUrl})`;
  }
}

const API_CANDIDATES = buildApiCandidates(API);

// Token can be set externally by the StoreProvider once auth is ready
let _token: string | null = null;
export function setAuthToken(token: string | null) { _token = token; }

async function resolveAuthToken(): Promise<string | null> {
  try {
    const { session } = await getSessionSafe();
    const token = session?.access_token ?? null;
    if (token) {
      _token = token;
      return token;
    }
  } catch (error) {
    console.warn('[gql] Failed to resolve auth token from Supabase session', error);
  }
  // Fall back to externally-set token if session lookup failed
  return _token;
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const queryName = query.match(/(query|mutation) (\w+)/)?.[2] || 'Unknown';
  const token = await resolveAuthToken();

  console.log(`[gql] [${queryName}] Requesting...`, {
    token: token ? `YES (${token.substring(0, 10)}...)` : 'MISSING',
    apiUrl: API,
    apiCandidates: API_CANDIDATES,
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let res: Response | null = null;
    let usedApi = API;

    for (const candidate of API_CANDIDATES) {
      try {
        const maybeRes = await fetch(candidate, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables }),
        });
        res = maybeRes;
        usedApi = candidate;
        break;
      } catch (error) {
        console.warn(`[gql] [${queryName}] Network failed on ${candidate}, trying next candidate...`);
      }
    }

    if (!res) {
      const diagnostics = await Promise.all(API_CANDIDATES.map(diagnoseApiReachability));
      const diagnosticMessage = diagnostics.join(' | ');
      throw new Error(
        `NetworkError when attempting to fetch resource. ${diagnosticMessage}`
      );
    }

    if (res.status === 401) {
      console.error(`[gql] [${queryName}] Unauthorized! Status: 401 (${usedApi})`);
      _token = null; // Clear stale token so next call forces a fresh session lookup
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[gql] [${queryName}] HTTP Error: ${res.status} (${usedApi})`, text);
      throw new Error(`HTTP Error ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json.errors?.length) {
      console.error(`[gql] [${queryName}] GraphQL Errors:`, json.errors);
      throw new Error(json.errors[0].message);
    }
    return json.data as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gql] [${queryName}] FETCH FAILED:`, message);
    throw err;
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const Q_PRODUCTS = `
  query GetProducts {
    products {
      id name genericName brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx isControlled
    }
  }
`;

export const Q_PRODUCTS_BY_SUPPLIER = `
  query GetProductsBySupplier($supplierId: String!) {
    productsBySupplier(supplierId: $supplierId) {
      id name genericName brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx isControlled
    }
  }
`;

export const Q_SUPPLIERS = `
  query GetSuppliers {
    suppliers {
      id name contact phone email address tin aiScore categories
    }
  }
`;

export const Q_SALES = `
  query GetSales {
    sales {
      id totalAmount amountPaid change paymentMethod
      customerName customerPhone receiptNo subtotal discountAmt discountReason
      nhil getfund covid19Levy vat nhisClaimNo status profitMargin averageItemValue
      customerType notes isRefunded refundReason refundedAt createdAt cashierId
      user { id name role }
      items {
        id quantity unitPrice total batchNo
        product { id name category }
      }
    }
  }
`;

export const Q_LOGIN_STAFF = `
  query GetLoginStaff {
    loginStaff {
      id name email role avatarUrl position phone
    }
  }
`;

export const M_CREATE_STAFF_ACCOUNT = `
  mutation CreateStaffAccount($email: String!, $password: String!, $name: String!, $role: UserRole!, $branchId: String!, $position: String) {
    createStaffAccount(email: $email, password: $password, name: $name, role: $role, branchId: $branchId, position: $position)
  }
`;

export const M_SETUP_STAFF_PASSWORD = `
  mutation SetupStaffPassword($email: String!, $password: String!, $token: String!) {
    setupStaffPassword(email: $email, password: $password, token: $token)
  }
`;

export const M_GENERATE_STAFF_PASSWORDS = `
  mutation GenerateStaffPasswords {
    generateStaffPasswords
  }
`;

export const M_CHANGE_PASSWORD = `
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const M_FORGOT_PASSWORD = `
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export const M_RESET_PASSWORD = `
  mutation ResetPassword($token: String!, $email: String!, $newPassword: String!) {
    resetPassword(token: $token, email: $email, newPassword: $newPassword)
  }
`;

export const Q_STAFF = `
  query GetStaff {
    staff {
      id supabaseId email name avatarUrl role
      branchId isOnDuty lastSeen position isActive
      branch { id name location phone }
    }
  }
`;

export const Q_ME = `
  query Me {
    me {
      id supabaseId email name avatarUrl role
      branchId isOnDuty lastSeen position isActive
      branch { id name location phone }
    }
  }
`;

export const Q_CUSTOMERS = `
  query GetCustomers {
    customers {
      id name email phone address loyaltyPoints totalSpent createdAt
    }
  }
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const M_CREATE_SALE = `
  mutation CreateSale(
    $userId: String!
    $branchId: String!
    $items: [SaleItemInput!]!
    $paymentMethod: PaymentMethod!
    $amountPaid: Float!
    $customerId: String
    $customerName: String
    $customerPhone: String
    $customerEmail: String
  ) {
    createSale(
      userId: $userId
      branchId: $branchId
      items: $items
      paymentMethod: $paymentMethod
      amountPaid: $amountPaid
      customerId: $customerId
      customerName: $customerName
      customerPhone: $customerPhone
      customerEmail: $customerEmail
    ) {
      id totalAmount amountPaid change paymentMethod customerName createdAt
      items {
        id quantity unitPrice total batchNo
        product { id name category }
      }
    }
  }
`;

export const M_CLOSE_TERMINAL = `
  mutation CloseTerminal($userId: String!, $physicalCash: Float, $digitalPayments: Float, $notes: String) {
    closeTerminal(userId: $userId, physicalCash: $physicalCash, digitalPayments: $digitalPayments, notes: $notes) {
      id status notes cashierName branchName totalSales cashSales momoSales
      cardSales nhisSales creditSales transactionCount closingTime
    }
  }
`;

export const M_REQUEST_EXPENSE = `
  mutation RequestExpense($branchId: String!, $categoryId: String!, $amount: Float!, $description: String!, $date: String!, $receiptUrl: String) {
    requestExpense(branchId: $branchId, categoryId: $categoryId, amount: $amount, description: $description, date: $date, receiptUrl: $receiptUrl) {
      id amount description date status
      category { id name }
      createdAt
    }
  }
`;

export const Q_AUTHORIZATIONS_SHIFT = `
  query GetShiftReconciliations {
    shiftReconciliations {
      id totalRevenue physicalCash digitalPayments discrepancy notes status createdAt
      pharmacist { id name }
      branch { id name }
      approvedBy { id name }
    }
  }
`;

export const Q_MY_SHIFT_RECONCILIATIONS = `
  query GetMyShiftReconciliations($userId: String!) {
    myShiftReconciliations(userId: $userId) {
      id totalRevenue physicalCash digitalPayments discrepancy notes status createdAt
      branch { id name }
      approvedBy { id name }
    }
  }
`;

export const Q_AUTHORIZATIONS_EXPENSE = `
  query GetAllExpenses {
    allExpenses {
      id amount description date status createdAt
      category { id name }
      requestedById
      approvedById
    }
  }
`;

export const M_APPROVE_SHIFT = `
  mutation ApproveShiftReconciliation($id: String!, $physicalCash: Float, $digitalPayments: Float, $notes: String) {
    approveShiftReconciliation(id: $id, physicalCash: $physicalCash, digitalPayments: $digitalPayments, notes: $notes) {
      id status physicalCash digitalPayments discrepancy notes
    }
  }
`;

export const M_REJECT_SHIFT = `
  mutation RejectShiftReconciliation($id: String!) {
    rejectShiftReconciliation(id: $id) {
      id status
    }
  }
`;

export const M_APPROVE_EXPENSE = `
  mutation ApproveExpense($id: String!) {
    approveExpense(id: $id) {
      id status
    }
  }
`;

export const M_REJECT_EXPENSE = `
  mutation RejectExpense($id: String!) {
    rejectExpense(id: $id) {
      id status
    }
  }
`;

export const M_CREATE_EXPENSE = `
  mutation CreateExpense($branchId: String!, $categoryId: String!, $amount: Float!, $description: String!, $date: String!, $receiptUrl: String) {
    createExpense(branchId: $branchId, categoryId: $categoryId, amount: $amount, description: $description, date: $date, receiptUrl: $receiptUrl) {
      id amount description date status
      category { id name }
      createdAt
    }
  }
`;

export const Q_EXPENSE_CATEGORIES = `
  query GetExpenseCategories {
    expenseCategories {
      id name
    }
  }
`;

export const M_GENERATE_TEMP_PASSWORD = `
  mutation GenerateTempPassword($userId: ID!) {
    generateTempPassword(userId: $userId)
  }
`;

export const M_INVITE_STAFF = `
  mutation InviteStaff($email: String!, $name: String!, $role: UserRole!, $branchId: String!) {
    inviteStaff(email: $email, name: $name, role: $role, branchId: $branchId)
  }
`;

export const M_UPDATE_STAFF_PROFILE = `
  mutation UpdateStaffProfile(
    $userId: ID!
    $role: UserRole
    $branchId: String
    $position: String
    $isActive: Boolean
  ) {
    updateStaffProfile(
      userId: $userId
      role: $role
      branchId: $branchId
      position: $position
      isActive: $isActive
    ) {
      id name email role branchId position isActive isOnDuty
    }
  }
`;

export const M_UPDATE_DUTY_STATUS = `
  mutation UpdateDutyStatus($userId: ID!, $isOnDuty: Boolean!) {
    updateDutyStatus(userId: $userId, isOnDuty: $isOnDuty) {
      id isOnDuty lastSeen
    }
  }
`;

export const M_UPDATE_PRODUCT_PRICES = `
  mutation UpdateProductPrices($productId: ID!, $costPrice: Float!, $sellingPrice: Float!) {
    updateProductPrices(productId: $productId, costPrice: $costPrice, sellingPrice: $sellingPrice) {
      id name costPrice sellingPrice stockQuantity
    }
  }
`;

export const M_UPDATE_PRODUCT_SUPPLIER = `
  mutation UpdateProductSupplier($productId: ID!, $supplierId: ID!) {
    updateProductSupplier(productId: $productId, supplierId: $supplierId) {
      id name supplierId
    }
  }
`;

export const M_BULK_UPDATE_PRODUCT_SUPPLIER = `
  mutation BulkUpdateProductSupplier($productIds: [ID!]!, $supplierId: ID!) {
    bulkUpdateProductSupplier(productIds: $productIds, supplierId: $supplierId) {
      id name supplierId
    }
  }
`;

export const M_REFUND_SALE = `
  mutation RefundSale($saleId: ID!, $reason: String!) {
    refundSale(saleId: $saleId, reason: $reason) {
      id status isRefunded refundReason totalAmount paymentMethod
    }
  }
`;

export const M_CREATE_CUSTOMER = `
  mutation CreateCustomer($name: String!, $email: String, $phone: String, $address: String) {
    createCustomer(name: $name, email: $email, phone: $phone, address: $address) {
      id name email phone loyaltyPoints totalSpent
    }
  }
`;

export const M_UPDATE_CUSTOMER = `
  mutation UpdateCustomer($id: ID!, $name: String, $email: String, $phone: String, $address: String) {
    updateCustomer(id: $id, name: $name, email: $email, phone: $phone, address: $address) {
      id name email phone loyaltyPoints totalSpent
    }
  }
`;

export const M_GENERATE_PRODUCT_IMAGE = `
  mutation GenerateProductImage($name: String!) {
    generateProductImage(name: $name)
  }
`;

export const Q_SEARCH_PRODUCTS = `
  query SearchProducts($query: String!, $limit: Int) {
    searchProducts(query: $query, limit: $limit) {
      id name genericName brand category
      strength dosageForm sellingPrice costPrice
      stockQuantity supplierId imageUrl
      barcode nafdacNo requiresRx isControlled isActive
    }
  }
`;

export const Q_PRESCRIPTIONS = `
  query GetPrescriptions {
    prescriptions {
      id rxNumber patientName patientAge patientPhone
      doctorName status issueDate expiryDate dispensedAt
      items { id drugName quantity dosage dispensed }
    }
  }
`;

export const Q_PURCHASES = `
  query GetPurchases {
    purchases {
      id invoiceNo invoiceDate status total
      supplier { id name }
      items { id quantity unitCost total product { id name } }
    }
  }
`;

export const Q_EXPENSES = `
  query GetExpenses {
    expenses {
      id amount description date receiptUrl
      category { id name }
    }
  }
`;

export const Q_LEDGER = `
  query GetLedger($branchId: String!) {
    ledgerEntries(branchId: $branchId) {
      id type account amount date description
    }
  }
`;

export const M_CREATE_PURCHASE = `
  mutation CreatePurchase(
    $branchId: String!
    $supplierId: String!
    $invoiceNo: String
    $items: [PurchaseItemInput!]!
    $tax: Float
    $autoReceive: Boolean
  ) {
    createPurchase(
      branchId: $branchId
      supplierId: $supplierId
      invoiceNo: $invoiceNo
      items: $items
      tax: $tax
      autoReceive: $autoReceive
    ) {
      id invoiceNo total status createdAt
    }
  }
`;

export const M_CREATE_PRODUCT = `
  mutation CreateProduct(
    $name: String!
    $genericName: String
    $brand: String
    $category: DrugCategory!
    $costPrice: Float!
    $sellingPrice: Float!
    $stockQuantity: Int!
    $supplierId: String
    $strength: String
    $dosageForm: DosageForm
    $barcode: String
    $nafdacNo: String
    $requiresRx: Boolean
    $isControlled: Boolean
    $imageUrl: String
  ) {
    createProduct(
      name: $name
      genericName: $genericName
      brand: $brand
      category: $category
      costPrice: $costPrice
      sellingPrice: $sellingPrice
      stockQuantity: $stockQuantity
      supplierId: $supplierId
      strength: $strength
      dosageForm: $dosageForm
      barcode: $barcode
      nafdacNo: $nafdacNo
      requiresRx: $requiresRx
      isControlled: $isControlled
      imageUrl: $imageUrl
    ) {
      id name brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx isControlled
    }
  }
`;

export const M_DELETE_PRODUCT = `
  mutation DeleteProduct($productId: ID!) {
    deleteProduct(productId: $productId)
  }
`;

export const M_UPDATE_PRODUCT_STOCK = `
  mutation UpdateProductStock($productId: ID!, $quantity: Int!, $reason: String) {
    updateProductStock(productId: $productId, quantity: $quantity, reason: $reason) {
      id name stockQuantity
    }
  }
`;

export const M_UPDATE_PRODUCT = `
  mutation UpdateProduct(
    $id: ID!
    $name: String
    $genericName: String
    $brand: String
    $category: DrugCategory
    $costPrice: Float
    $sellingPrice: Float
    $supplierId: String
    $requiresRx: Boolean
    $isControlled: Boolean
    $imageUrl: String
    $dosageForm: DosageForm
    $strength: String
    $barcode: String
    $nafdacNo: String
  ) {
    updateProduct(
      id: $id
      name: $name
      genericName: $genericName
      brand: $brand
      category: $category
      costPrice: $costPrice
      sellingPrice: $sellingPrice
      supplierId: $supplierId
      requiresRx: $requiresRx
      isControlled: $isControlled
      imageUrl: $imageUrl
      dosageForm: $dosageForm
      strength: $strength
      barcode: $barcode
      nafdacNo: $nafdacNo
    ) {
      id name genericName brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx isControlled barcode nafdacNo
    }
  }
`;

export const M_CREATE_SUPPLIER = `
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
      id name contact phone email address tin aiScore
    }
  }
`;

export const M_UPDATE_SUPPLIER = `
  mutation UpdateSupplier($id: ID!, $input: CreateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id name contact phone email address tin aiScore
    }
  }
`;

export const M_DELETE_SUPPLIER = `
  mutation DeleteSupplier($id: ID!) {
    deleteSupplier(id: $id)
  }
`;

export const M_RECEIVE_INVOICE = `
  mutation ReceiveInvoice(
    $branchId: String!
    $supplierId: String!
    $invoiceNo: String!
    $invoiceDate: String!
    $dueDate: String
    $items: [PurchaseItemInput!]!
    $tax: Float
    $notes: String
  ) {
    receiveInvoice(
      branchId: $branchId
      supplierId: $supplierId
      invoiceNo: $invoiceNo
      invoiceDate: $invoiceDate
      dueDate: $dueDate
      items: $items
      tax: $tax
      notes: $notes
    ) {
      id invoiceNo total status createdAt
    }
  }
`;

export const Q_INVOICES = `
  query GetInvoices($branchId: String!, $supplierId: String) {
    invoices(branchId: $branchId, supplierId: $supplierId) {
      id invoiceNo type total paidAmount balance paymentStatus issueDate dueDate createdAt
      supplier { id name }
      payments { id amount method reference notes paidAt }
      uploadedBy { id name role }
      purchase {
        id
        items {
          id quantity unitCost total
          product { id name costPrice }
        }
      }
    }
  }
`;

export const M_RECORD_SUPPLIER_PAYMENT = `
  mutation RecordSupplierPayment($invoiceId: ID!, $amount: Float!, $method: String!, $reference: String, $notes: String) {
    recordSupplierPayment(invoiceId: $invoiceId, amount: $amount, method: $method, reference: $reference, notes: $notes) {
      id paidAmount balance paymentStatus
      payments { id amount method paidAt }
    }
  }
`;

export const M_ASK_NEXUS_AI = `
  mutation AskNexusAi($prompt: String!) {
    askNexusAi(prompt: $prompt)
  }
`;

export const M_GUARD_LOGIN_TOKEN_REQUEST = `
  mutation GuardLoginTokenRequest($email: String!) {
    guardLoginTokenRequest(email: $email)
  }
`;

export const M_GUARD_LOGIN_TOKEN_VERIFY = `
  mutation GuardLoginTokenVerify($email: String!) {
    guardLoginTokenVerify(email: $email)
  }
`;

export const M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT = `
  mutation RecordLoginTokenVerifyAttempt($email: String!, $success: Boolean!, $reason: String) {
    recordLoginTokenVerifyAttempt(email: $email, success: $success, reason: $reason)
  }
`;

export const M_CREATE_PRESCRIPTION = `
  mutation CreatePrescription(
    $branchId: String!
    $rxNumber: String!
    $patientName: String!
    $patientAge: Int
    $patientPhone: String
    $doctorName: String
    $notes: String
    $items: [PrescriptionItemInput!]
  ) {
    createPrescription(
      branchId: $branchId
      rxNumber: $rxNumber
      patientName: $patientName
      patientAge: $patientAge
      patientPhone: $patientPhone
      doctorName: $doctorName
      notes: $notes
      items: $items
    ) {
      id
      rxNumber
      patientName
      patientAge
      status
    }
  }
`;

export const M_DISPENSE_PRESCRIPTION = `
  mutation DispensePrescription($id: ID!, $dispensedById: String!) {
    dispensePrescription(id: $id, dispensedById: $dispensedById) {
      id
      status
      dispensedAt
    }
  }
`;

export const M_DELETE_INVOICE = `
  mutation DeleteInvoice($invoiceId: ID!) {
    deleteInvoice(invoiceId: $invoiceId)
  }
`;

export const Q_BRANCHES = `
  query GetBranches {
    branches {
      id name location phone
    }
  }
`;
