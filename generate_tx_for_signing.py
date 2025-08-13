#!/usr/bin/env python3
"""
Script para gerar transações prontas para assinar
Você pode usar isso com qualquer wallet que aceite transações pré-formatadas
"""

import json

CONTRACT_ADDRESS = "0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48"

# Dados das transações
TRANSACTIONS = {
    "arbitrum": {
        "chainId": 42161,
        "name": "Arbitrum One",
        "transactions": [
            {
                "token": "ETH",
                "data": "0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "token": "USDC",
                "data": "0xeb0835bf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831"
            },
            {
                "token": "USDT", 
                "data": "0xeb0835bf000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
            }
        ]
    },
    "base": {
        "chainId": 8453,
        "name": "Base",
        "transactions": [
            {
                "token": "ETH",
                "data": "0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "token": "USDC",
                "data": "0xeb0835bf000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913"
            },
            {
                "token": "USDT",
                "data": "0xeb0835bf000000000000000000000000fde4c96c8593536e31f229ea8f37b2ada2699bb2"
            }
        ]
    },
    "optimism": {
        "chainId": 10,
        "name": "Optimism",
        "transactions": [
            {
                "token": "ETH",
                "data": "0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "token": "USDC",
                "data": "0xeb0835bf0000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85"
            },
            {
                "token": "USDT",
                "data": "0xeb0835bf00000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e58"
            }
        ]
    },
    "polygon": {
        "chainId": 137,
        "name": "Polygon",
        "transactions": [
            {
                "token": "ETH",
                "data": "0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "token": "USDC",
                "data": "0xeb0835bf0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174"
            },
            {
                "token": "USDT",
                "data": "0xeb0835bf000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f"
            }
        ]
    }
}

def generate_tx_json():
    """Gera arquivos JSON para cada transação"""
    
    for network_key, network_data in TRANSACTIONS.items():
        print(f"\n{'='*50}")
        print(f"🌐 {network_data['name']} (Chain ID: {network_data['chainId']})")
        print(f"{'='*50}")
        
        for tx in network_data['transactions']:
            # Cria o objeto da transação
            transaction = {
                "to": CONTRACT_ADDRESS,
                "value": "0x0",
                "data": tx['data'],
                "chainId": network_data['chainId']
            }
            
            # Nome do arquivo
            filename = f"tx_{network_key}_{tx['token'].lower()}.json"
            
            # Salva o arquivo
            with open(filename, 'w') as f:
                json.dump(transaction, f, indent=2)
            
            print(f"\n✅ Criado: {filename}")
            print(f"   Token: {tx['token']}")
            print(f"   Para usar: Importe este JSON na sua wallet")

def generate_copy_paste():
    """Gera comandos para copiar e colar"""
    
    print("\n\n" + "="*70)
    print("📋 COMANDOS PARA COPIAR E COLAR NO CONSOLE")
    print("="*70)
    
    for network_key, network_data in TRANSACTIONS.items():
        print(f"\n// {network_data['name']} (Chain ID: {network_data['chainId']})")
        print(f"// Certifique-se de estar na rede correta!\n")
        
        for tx in network_data['transactions']:
            print(f"// Habilitar {tx['token']}:")
            print(f"await ethereum.request({{")
            print(f"  method: 'eth_sendTransaction',")
            print(f"  params: [{{")
            print(f"    from: ethereum.selectedAddress,")
            print(f"    to: '{CONTRACT_ADDRESS}',")
            print(f"    data: '{tx['data']}',")
            print(f"    value: '0x0'")
            print(f"  }}]")
            print(f"}});")
            print()

def generate_curl_commands():
    """Gera comandos curl para APIs"""
    
    print("\n\n" + "="*70)
    print("🔧 COMANDOS CURL PARA WALLETS QUE SUPORTAM API")
    print("="*70)
    
    for network_key, network_data in TRANSACTIONS.items():
        print(f"\n# {network_data['name']}")
        
        for tx in network_data['transactions']:
            print(f"\n# Habilitar {tx['token']}:")
            print(f"curl -X POST -H 'Content-Type: application/json' \\")
            print(f"  -d '{{")
            print(f'    "to": "{CONTRACT_ADDRESS}",')
            print(f'    "data": "{tx["data"]}",')
            print(f'    "value": "0x0"')
            print(f"  }}' \\")
            print(f"  YOUR_WALLET_API_ENDPOINT")

if __name__ == "__main__":
    print("🔧 Gerador de Transações para Habilitar Tokens")
    print("=" * 70)
    
    # Gera arquivos JSON
    generate_tx_json()
    
    # Gera comandos para console
    generate_copy_paste()
    
    # Gera comandos curl
    generate_curl_commands()
    
    print("\n\n✅ Pronto! Use qualquer um dos métodos acima.")
    print("💡 Dica: Os arquivos JSON podem ser importados em muitas wallets.")