declare module "mermaid" {
  const mermaid: {
    initialize: (config: any) => void;
    render: (id: string, definition: string) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
  };
  export default mermaid;
}
