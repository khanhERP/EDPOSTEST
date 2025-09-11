export const loginPosAsync = async (request: LoginPosRequest): Promise<LoginResponse> => {
  const response = await fetch('/api/pos/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to login for QR payment');
  }

  return response.json();
};

export interface LoginPosRequest {
  clientID: string;
  clientSecret: string;
  masterId: string;
  bankCode: string;
}

export interface LoginResponse {
  token: string;
  // Add other response fields as needed
}

export interface CreateQRPosRequest {
  transactionUuid: string;
  depositAmt: number;
  posUniqueId: string;
  accntNo: string;
  posfranchiseeName: string;
  posCompanyName: string;
  posBillNo: string;
}

export interface CreateQRPosResponse {
  qrDataDecode: string;
  qrUrl: string;
  qrData: string;
}

export const createQRPosAsync = async (request: CreateQRPosRequest, bankCode: string, clientID: string): Promise<CreateQRPosResponse> => {
  // Use the new external API endpoint
  const response = await fetch('http://1.55.212.135:9335/api/Ec/CreateQuickQr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      bankCode,
      clientID
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('CreateQuickQr API error:', response.status, errorText);
    throw new Error(`Failed to create QR payment: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  // Transform response to match expected format if needed
  return {
    qrDataDecode: result.qrDataDecode || result.qrData,
    qrUrl: result.qrUrl || '',
    qrData: result.qrData || result.qrDataDecode || ''
  };
};