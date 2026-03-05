import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({ rows, columns, pageSize = 10 }: { rows: T[]; columns: Column<T>[]; pageSize?: number }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof T>(columns[0].key);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return rows.filter((row) => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(normalized)));
  }, [rows, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortBy] ?? '');
      const bv = String(b[sortBy] ?? '');
      return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortBy, direction]);

  const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      <Input placeholder="Filtrar..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => {
                    if (sortBy === col.key) {
                      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortBy(col.key);
                      setDirection('asc');
                    }
                  }}
                >
                  {col.label} <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={String(col.key)}>{col.render ? col.render(row) : String(row[col.key] ?? '-')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Página {page} de {maxPage}
        </span>
        <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
