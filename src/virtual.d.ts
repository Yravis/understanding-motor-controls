declare module 'virtual:content' {
  const data: { manifest: any; sources: any[]; items: any[]; hashes: Record<string, string>; ledger: { id: string; hash: string; status: string }[] };
  export default data;
}
