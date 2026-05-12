import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: {
    tenantName: string;
    amount: number;
    method: string;
    reference: string;
    date: Date;
    month: string;
  } | null;
}

export function ReceiptModal({ open, onOpenChange, receiptData }: ReceiptModalProps) {
  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        <div className="bg-[#1e4d2b] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 relative z-10 backdrop-blur-sm">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">Payment Sent!</h2>
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1 relative z-10">
            Awaiting Verification
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center justify-center border-b border-dashed border-gray-200 pb-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
              <h3 className="text-4xl font-black text-[#1a1a1a]">₱{receiptData.amount.toLocaleString()}</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tenant</span>
              <span className="text-sm font-black text-[#1a1a1a]">{receiptData.tenantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">For Month</span>
              <span className="text-sm font-black text-[#1a1a1a]">{receiptData.month}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Method</span>
              <span className="text-sm font-black text-[#1a1a1a] uppercase">{receiptData.method}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference No.</span>
              <span className="text-sm font-black text-[#1a1a1a] font-mono">{receiptData.reference || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</span>
              <span className="text-xs font-black text-[#1a1a1a]">{format(receiptData.date, 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#1a1a1a] font-bold h-12"
            >
              Done
            </Button>
            <Button 
              className="flex-1 rounded-xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-bold h-12"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
