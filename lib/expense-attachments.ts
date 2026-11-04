import { getAuthToken, getCurrentApiUrl } from './gql';

export const EXPENSE_SUPPORT_BUCKET = 'expense-support';
export const MAX_EXPENSE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type ExpenseAttachmentKind = 'receiptUrl' | 'invoiceUrl' | 'paymentReceiptUrl';
export type ExpenseAttachmentFiles = Partial<Record<ExpenseAttachmentKind, File>>;
export type QueuedExpenseAttachment = {
  name: string;
  type: string;
  dataUrl: string;
};

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export function validateExpenseAttachment(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Attachments must be a PDF, JPEG, PNG, or WebP file.');
  }
  if (file.size > MAX_EXPENSE_ATTACHMENT_BYTES) {
    throw new Error('Each attachment must be 5 MB or smaller.');
  }
}

export function isSafeExpenseAttachmentUrl(value: string, allowLocalData = false): boolean {
  if (allowLocalData && /^data:(application\/pdf|image\/(jpeg|png|webp));base64,/i.test(value)) {
    return true;
  }
  try {
    const url = new URL(value);
    const configuredStorageUrl = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    );
    return url.origin === configuredStorageUrl.origin
      && url.pathname.startsWith('/storage/v1/object/sign/expense-support/')
      && Boolean(url.searchParams.get('token'));
  } catch {
    return false;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Could not read attachment "${file.name}".`));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error || new Error(`Could not read attachment "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'attachment';
}

export async function uploadExpenseAttachment(
  kind: ExpenseAttachmentKind,
  attachment: Blob,
  fileName: string,
  clientRef: string,
): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Sign in before uploading expense attachments.');

  const endpoint = new URL(getCurrentApiUrl());
  endpoint.pathname = '/api/expenses/attachments';
  endpoint.search = new URLSearchParams({ clientRef, kind }).toString();
  const formData = new FormData();
  formData.append('file', attachment, safeFileName(fileName));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result?.message === 'string' ? result.message : `Attachment upload failed (${response.status}).`;
    throw new Error(`HTTP error ${response.status}: ${message}`);
  }
  if (typeof result?.signedUrl !== 'string' || !isSafeExpenseAttachmentUrl(result.signedUrl)) {
    throw new Error('The server did not return a secure attachment link.');
  }
  return result.signedUrl;
}

export async function uploadQueuedExpenseAttachment(
  kind: ExpenseAttachmentKind,
  attachment: QueuedExpenseAttachment,
  clientRef: string,
): Promise<string> {
  const response = await fetch(attachment.dataUrl);
  if (!response.ok) throw new Error(`Could not restore queued attachment "${attachment.name}".`);
  const blob = await response.blob();
  if (blob.size > MAX_EXPENSE_ATTACHMENT_BYTES) {
    throw new Error(`Queued attachment "${attachment.name}" exceeds the 5 MB limit.`);
  }
  return uploadExpenseAttachment(kind, blob, attachment.name, clientRef);
}
