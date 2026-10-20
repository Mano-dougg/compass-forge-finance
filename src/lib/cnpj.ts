/** Receita Federal: módulo 11, valor de cada caractere = ASCII - 48. */
export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[./\s-]/g, "");
}
export function validarCnpj(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!/^[A-Z\d]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    let peso = 2;
    let soma = 0;
    for (let i = base.length - 1; i >= 0; i--) {
      soma += (base.charCodeAt(i) - 48) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return String(resto < 2 ? 0 : 11 - resto);
  };
  const primeiro = digito(cnpj.slice(0, 12));
  return cnpj.slice(12) === primeiro + digito(cnpj.slice(0, 12) + primeiro);
}
export function formatarCnpj(valor: string): string {
  return normalizarCnpj(valor).replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");
}
