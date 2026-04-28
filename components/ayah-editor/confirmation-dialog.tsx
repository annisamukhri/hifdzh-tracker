import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmationDialogProps {
  open: boolean
  toAdd: number[]
  toRemove: number[]
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  open,
  toAdd,
  toRemove,
  saving,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirm Changes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {toAdd.length > 0 && (
            <div>
              <p className="font-medium text-green-600 dark:text-green-400 mb-1">
                Newly memorized
              </p>
              <p className="text-muted-foreground">
                Ayah{toAdd.length > 1 ? 's' : ''}: {toAdd.join(', ')}
              </p>
            </div>
          )}

          {toRemove.length > 0 && (
            <div>
              <p className="font-medium text-destructive mb-1">
                Removed from memorized
              </p>
              <p className="text-muted-foreground">
                Ayah{toRemove.length > 1 ? 's' : ''}: {toRemove.join(', ')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
