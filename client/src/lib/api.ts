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
  try {
    console.log('🎯 Calling CreateQRPos via proxy...');
    console.log('📤 Request payload:', { ...request, bankCode, clientID });
    
    // Use proxy route to avoid CORS issues
    const response = await fetch('/api/pos/create-qr-proxy', {
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

    console.log('📡 Proxy API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Proxy API error:', errorData);
      throw new Error(`Proxy API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Proxy API success:', result);
    
    // Transform response to match expected format
    return {
      qrDataDecode: result.qrDataDecode || result.qrData || '',
      qrUrl: result.qrUrl || '',
      qrData: result.qrData || result.qrDataDecode || ''
    };

  } catch (error) {
    console.error('❌ Proxy CreateQRPos API failed:', error);
    console.log('🔄 Falling back to internal API...');
    
    // Fallback to internal API
    const fallbackResponse = await fetch(`/api/pos/create-qr?bankCode=${bankCode}&clientID=${clientID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!fallbackResponse.ok) {
      const errorText = await fallbackResponse.text();
      console.error('Fallback API error:', fallbackResponse.status, errorText);
      throw new Error(`Failed to create QR payment: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
    }

    const fallbackResult = await fallbackResponse.json();
    console.log('✅ Fallback API success:', fallbackResult);
    
    return fallbackResult;
  }
};