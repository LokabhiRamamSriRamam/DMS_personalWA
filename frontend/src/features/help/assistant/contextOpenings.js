export function getContextNode(pathname) {
  if (pathname === '/') return 'ctx-appointments';
  if (pathname.startsWith('/treatment')) return 'ctx-treatment';
  if (pathname.startsWith('/patients')) return 'ctx-patients';
  if (pathname.startsWith('/invoices') || pathname.startsWith('/transactions')) return 'ctx-billing';
  if (pathname.startsWith('/inventory')) return 'ctx-inventory';
  if (pathname.startsWith('/lab')) return 'ctx-lab';
  if (pathname.startsWith('/whatsapp')) return 'ctx-whatsapp';
  if (pathname.startsWith('/insights')) return 'ctx-reports';
  return 'root';
}
