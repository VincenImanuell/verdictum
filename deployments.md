# Deployments — Somnia Shannon testnet (chain id 50312)

Platform (IAgentRequester): `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
Explorer: https://shannon-explorer.somnia.network

| Milestone | Contract | Address | Notes |
|---|---|---|---|
| M1 | `Counter` (hello-world) | `0xf0C78a961ba70C780aA781988B018dFb3f539256` | store/read a uint; proves compile→deploy→explorer |
| M2 | `JsonAgentCaller` | `0x9EB1F934F0ABd0645764E939Cb5338611c8d3296` | async createRequest→handleResponse via JSON API agent; fetched BTC price (lastValue 6742000000000 ≈ $67,420), status Success |

### Tx references
- M1 deploy: `0x4bb288f23b78614605fd19f032131cd499788b2e320c5b19a8ea5f49045b5f8d`
- M1 setNumber(42): `0x939209592945fa7c5bcefa621d4d6fdf8e7681f119692858e0f0f504588eed8d`
- M2 deploy: `0x0c94876a7ab9bed99f46a3fc0e209d905ac6125186b3024aaddbbccc9ab0606e`
- M2 requestFetch: `0x33236660af738885735047c86e1e3039e9698af72f8e96ba6f1c4a28cc3ca152`
