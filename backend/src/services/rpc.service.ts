import axios from 'axios';

interface RPCRequest {
  method: string;
  params?: any[];
  id?: number;
  jsonrpc?: string;
}

interface RPCResponse {
  id: number;
  jsonrpc: string;
  result?: any;
  error?: any;
}

class RPCService {
  private alchemyKey: string;
  private supportedChains: { [key: number]: string } = {
    1: 'eth-mainnet',
    137: 'polygon-mainnet', 
    42161: 'arb-mainnet',
    10: 'opt-mainnet',
    8453: 'base-mainnet'
  };

  constructor() {
    this.alchemyKey = process.env.ALCHEMY_API_KEY || '';
    if (!this.alchemyKey) {
      console.warn('ALCHEMY_API_KEY not found. RPC service will use fallback providers.');
    }
  }

  async makeRPCCall(chainId: number, request: RPCRequest): Promise<RPCResponse> {
    const networkName = this.supportedChains[chainId];
    
    if (!networkName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    if (!this.alchemyKey) {
      throw new Error('RPC service not configured');
    }

    const url = `https://${networkName}.g.alchemy.com/v2/${this.alchemyKey}`;
    
    try {
      const response = await axios.post(url, {
        method: request.method,
        params: request.params || [],
        id: request.id || 1,
        jsonrpc: '2.0'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error) {
      console.error(`RPC call failed for chain ${chainId}:`, error);
      throw new Error('RPC call failed');
    }
  }

  async getBlockNumber(chainId: number): Promise<string> {
    const response = await this.makeRPCCall(chainId, {
      method: 'eth_blockNumber',
      params: []
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  async getBalance(chainId: number, address: string): Promise<string> {
    const response = await this.makeRPCCall(chainId, {
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  async call(chainId: number, transaction: any): Promise<string> {
    const response = await this.makeRPCCall(chainId, {
      method: 'eth_call',
      params: [transaction, 'latest']
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  async sendTransaction(chainId: number, signedTransaction: string): Promise<string> {
    const response = await this.makeRPCCall(chainId, {
      method: 'eth_sendRawTransaction',
      params: [signedTransaction]
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  async getTransactionReceipt(chainId: number, txHash: string): Promise<any> {
    const response = await this.makeRPCCall(chainId, {
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }
}

export const rpcService = new RPCService();