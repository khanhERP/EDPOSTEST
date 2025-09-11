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
    console.log('🎯 Attempting to call external CreateQRPos API...');
    console.log('📤 Request payload:', { ...request, bankCode, clientID });
    
    // Try the new external API endpoint first
    const response = await fetch('http://1.55.212.138:9335/api/CreateQRPos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...request,
        bankCode,
        clientID
      }),
    });

    console.log('📡 External API response status:', response.status);
    console.log('📡 External API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ External API error response:', responseText.substring(0, 200));
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('❌ Non-JSON response received:', responseText.substring(0, 200));
      throw new Error(`External API returned non-JSON response. Content-Type: ${contentType}`);
    }

    const result = await response.json();
    console.log('✅ External API success:', result);
    
    // Transform response to match expected format
    return {
      qrDataDecode: result.qrDataDecode || result.qrData || '',
      qrUrl: result.qrUrl || '',
      qrData: result.qrData || result.qrDataDecode || ''
    };

  } catch (error) {
    console.error('❌ External CreateQRPos API failed:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 Network error - API server might be unreachable');
    }
    
    // Check if it's a CORS error
    if (error instanceof TypeError && error.message.includes('CORS')) {
      console.error('🚫 CORS error - API server not allowing cross-origin requests');
    }
    
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