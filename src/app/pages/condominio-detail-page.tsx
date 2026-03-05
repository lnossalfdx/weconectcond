import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, PlusCircle, Users } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timeline } from '@/features/timeline/components';
import { Badge } from '@/components/ui/badge';
import { currency } from '@/lib/utils';
import { upsertProposal } from '@/features/propostas/api';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabaseClient';

type Hotspot = {
  id: string;
  x: number;
  y: number;
  description: string;
  qty: number;
  price: number;
  selected: boolean;
};

export function CondominioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  const query = useQuery({
    queryKey: ['condo-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('condominiums').select('*, contacts(*)').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const condo = query.data;
  const storageImageKey = `condo-map-image-${id ?? 'unknown'}`;
  const storageHotspotsKey = `condo-map-hotspots-${id ?? 'unknown'}`;

  useEffect(() => {
    if (!id) return;
    const savedImage = localStorage.getItem(storageImageKey);
    const savedHotspots = localStorage.getItem(storageHotspotsKey);
    if (savedImage) setMapImage(savedImage);
    if (savedHotspots) {
      try {
        setHotspots(JSON.parse(savedHotspots) as Hotspot[]);
      } catch {
        setHotspots([]);
      }
    }
  }, [id, storageImageKey, storageHotspotsKey]);

  useEffect(() => {
    if (!id) return;
    if (mapImage) localStorage.setItem(storageImageKey, mapImage);
    localStorage.setItem(storageHotspotsKey, JSON.stringify(hotspots));
  }, [id, mapImage, hotspots, storageImageKey, storageHotspotsKey]);

  const selectedItems = useMemo(() => hotspots.filter((h) => h.selected), [hotspots]);
  const total = useMemo(() => selectedItems.reduce((sum, h) => sum + h.qty * h.price, 0), [selectedItems]);

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      if (!selectedItems.length) throw new Error('Selecione ao menos 1 item no mapa.');

      const proposal = await upsertProposal({
        condominium_id: id,
        lead_id: null,
        status: 'rascunho',
        items: selectedItems.map((h) => ({
          description: h.description,
          qty: h.qty,
          price: h.price,
          x: h.x,
          y: h.y,
        })),
        total,
      });
      return proposal;
    },
    onSuccess: async (proposal: any) => {
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta gerada pelo mapa interativo.');
      navigate('/app/propostas');
      return proposal;
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const addHotspotByClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const description = window.prompt('Nome do item/serviço para este ponto:');
    if (!description) return;
    const qtyRaw = window.prompt('Quantidade:', '1');
    const priceRaw = window.prompt('Preço unitário (R$):', '0');
    const qty = Number(qtyRaw ?? '1');
    const price = Number(priceRaw ?? '0');

    setHotspots((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x,
        y,
        description,
        qty: Number.isNaN(qty) ? 1 : qty,
        price: Number.isNaN(price) ? 0 : price,
        selected: true,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detalhe do Condomínio"
        description="Dados, contatos e histórico"
        actions={
          <Button variant="outline" asChild>
            <Link to="/app/condominios"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      {condo && (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />{condo.name}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{condo.address || '-'} · {condo.city || '-'}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{condo.units_count} unidades · {condo.blocks_count} blocos</div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Contatos</p>
                  <div className="space-y-1">
                    {(condo.contacts ?? []).map((c: any) => <div key={c.id} className="rounded-md border p-2">{c.name} {c.email ? `· ${c.email}` : ''}</div>)}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Timeline entityType="condominium" entityId={condo.id} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Mapa Interativo + Proposta</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedItems.length} itens selecionados</Badge>
                  <Badge>{currency.format(total)}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setMapImage(String(reader.result));
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Enviar imagem do mapa
                </Button>
                <Button variant="outline" onClick={() => setHotspots([])}>Limpar pontos</Button>
                <Button onClick={() => proposalMutation.mutate()} disabled={proposalMutation.isPending || selectedItems.length === 0}>
                  Gerar proposta a partir do mapa
                </Button>
              </div>

              {mapImage ? (
                <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="relative overflow-hidden rounded-xl border bg-muted/30">
                    <img
                      ref={imageRef}
                      src={mapImage}
                      alt="Mapa do condomínio"
                      className="h-auto w-full cursor-crosshair"
                      onClick={addHotspotByClick}
                    />
                    {hotspots.map((spot) => (
                      <button
                        key={spot.id}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[10px] font-semibold ${spot.selected ? 'bg-primary text-white' : 'bg-card text-foreground'}`}
                        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHotspots((prev) => prev.map((h) => (h.id === spot.id ? { ...h, selected: !h.selected } : h)));
                        }}
                      >
                        {spot.description}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-xl border p-3">
                    <p className="text-sm font-semibold">Itens do mapa</p>
                    {hotspots.length === 0 && <p className="text-xs text-muted-foreground">Clique na imagem para criar pontos de proposta.</p>}
                    {hotspots.map((spot) => (
                      <div key={spot.id} className="rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{spot.description}</p>
                          <Badge variant={spot.selected ? 'default' : 'secondary'}>{spot.selected ? 'incluído' : 'fora'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Qtd {spot.qty} · {currency.format(spot.price)} · Posição {spot.x.toFixed(1)}% / {spot.y.toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Envie a imagem/planta do condomínio para habilitar mapa clicável e geração de proposta.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
