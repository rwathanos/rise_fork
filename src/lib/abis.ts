import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
]);

export const riseFactoryAbi = parseAbi([
  "function createToken(string name, string symbol, string metadataURI, address backingAsset, uint8 creatorVariableFeeBps) payable returns (address token, address pool)",
  "function creationFee() view returns (uint256)",
  "function tokenToPool(address token) view returns (address)",
  "function poolToToken(address pool) view returns (address)",
  "function supportedBackingAsset(address asset) view returns (bool)",
  "event TokenCreated(address indexed token, address indexed pool, address indexed creator, address backingAsset, uint8 creatorVariableFeeBps, string metadataURI)",
]);

export const risePoolAbi = parseAbi([
  "function buy(uint256 reserveIn, uint256 minTokensOut) payable returns (uint256 tokensOut)",
  "function sell(uint256 tokenIn, uint256 minReserveOut) returns (uint256 reserveOut)",
  "function openBorrow(uint256 collateralAmount, uint256 borrowAmount) returns (uint256 originationFee)",
  "function repayAll() payable returns (uint256 repaid)",
  "function claimCreatorFees() returns (uint256 amount)",
  "function quoteBuy(uint256 reserveIn) view returns (uint256 tokensOut)",
  "function quoteSell(uint256 tokenIn) view returns (uint256 reserveOut)",
  "function getFloorPrice() view returns (uint256)",
  "function getMarketPrice() view returns (uint256)",
  "function getReserves() view returns (uint256 reserveTotal, uint256 supplyTotal, uint256 reserveBalance)",
  "function getPosition(address user) view returns (uint256 collateral, uint256 debt)",
  "function maxBorrow(address user) view returns (uint256)",
  "function backingDecimals() view returns (uint8)",
  "function isNativeBacking() view returns (bool)",
  "function creator() view returns (address)",
  "function creatorVariableFeeBps() view returns (uint8)",
  "function metadataURI() view returns (string)",
  "function token() view returns (address)",
  "function pendingCreatorFeesWad() view returns (uint256)",
]);
