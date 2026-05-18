export default function RiskPage() {
  return (
    <article className="prose prose-invert max-w-3xl">
      <h1>风险披露</h1>
      <p>本平台提供无许可代币创建、协议对手方交易、地板价机制与无清算借贷功能。以下风险请你在使用前充分理解。</p>
      <ul>
        <li>无协议清算不等于无亏损，市价高于地板的部分仍会波动。</li>
        <li>地板价由链上合约与储备约束，不保证站外 DEX 或私下转让价格。</li>
        <li>智能合约可能存在漏洞，主网部署前应完成审计。</li>
        <li>平台不托管私钥，不承诺固定收益或保本。</li>
      </ul>
    </article>
  );
}
