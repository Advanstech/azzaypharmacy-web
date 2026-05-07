/**
 * Azzay Pharmacy NEXUS — GraphQL Client
 * Authenticated requests using Supabase JWT
 */

import { supabase } from '@/lib/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/graphql';

// Token can be set externally by the StoreProvider once auth is ready
let _token: string | null = null;
export function setAuthToken(token: string | null) { _token = token; }

async function resolveAuthToken(): Promise<string | null> {
  if (_token) return _token;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) {
      _token = token;
    }
    return token;
  } catch (error) {
    console.warn('[gql] Failed to resolve auth token from Supabase session', error);
    return null;
  }
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
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 401) {
      console.error(`[gql] [${queryName}] Unauthorized! Status: 401`);
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[gql] [${queryName}] HTTP Error: ${res.status}`, text);
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
      stockQuantity supplierId imageUrl strength dosageForm requiresRx
    }
  }
`;

export const Q_PRODUCTS_BY_SUPPLIER = `
  query GetProductsBySupplier($supplierId: String!) {
    productsBySupplier(supplierId: $supplierId) {
      id name genericName brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx
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
      customerName createdAt
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
      id name email role avatarUrl position
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
  mutation CloseTerminal($userId: String!) {
    closeTerminal(userId: $userId) {
      cashierName branchName totalSales cashSales momoSales
      cardSales nhisSales creditSales transactionCount closingTime
    }
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
    $category: String!
    $costPrice: Float!
    $sellingPrice: Float!
    $stockQuantity: Int!
    $supplierId: String
    $strength: String
    $dosageForm: String
    $barcode: String
    $nafdacNo: String
    $requiresRx: Boolean
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
      imageUrl: $imageUrl
    ) {
      id name brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm
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
    $category: String
    $costPrice: Float
    $sellingPrice: Float
    $supplierId: String
    $requiresRx: Boolean
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
    ) {
      id name genericName brand category sellingPrice costPrice
      stockQuantity supplierId imageUrl strength dosageForm requiresRx
    }
  }
`;

export const M_CREATE_SUPPLIER = `
  mutation CreateSupplier(
    $name: String!
    $contact: String
    $phone: String
    $email: String
    $address: String
    $tin: String
    $categories: [String!]
  ) {
    createSupplier(
      name: $name
      contact: $contact
      phone: $phone
      email: $email
      address: $address
      tin: $tin
      categories: $categories
    ) {
      id name contact phone email address tin aiScore categories
    }
  }
`;

export const M_UPDATE_SUPPLIER = `
  mutation UpdateSupplier(
    $id: ID!
    $name: String
    $contact: String
    $phone: String
    $email: String
    $address: String
    $tin: String
    $categories: [String!]
  ) {
    updateSupplier(
      id: $id
      name: $name
      contact: $contact
      phone: $phone
      email: $email
      address: $address
      tin: $tin
      categories: $categories
    ) {
      id name contact phone email address tin aiScore categories
    }
  }
`;

export const M_DELETE_SUPPLIER = `
  mutation DeleteSupplier($id: ID!) {
    deleteSupplier(id: $id)
  }
`;
