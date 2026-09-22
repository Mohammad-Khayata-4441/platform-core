import React from 'react'
import { useQueryStates, parseAsBoolean, parseAsString } from 'nuqs'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { ScrollArea } from '../shadcn/scroll-area'
import { Plus } from 'lucide-react'

export const formDialogParams = {
    dialog: parseAsBoolean.withDefault(false),
    resourceId: parseAsString,
}

export function useFormDialog(paramKey?: string) {
    // Default (no paramKey) uses the standard `dialog` and `resourceId` params
    const defaultState = useQueryStates(formDialogParams)

    // When a paramKey is provided, use prefixed params to avoid URL collisions
    const prefixedState = useQueryStates({
        [`${paramKey ?? "_"}_dialog`]: parseAsBoolean.withDefault(false),
        [`${paramKey ?? "_"}_resourceId`]: parseAsString,
    })

    if (paramKey) {
        const [params, setParams] = prefixedState
        const dialogKey = `${paramKey}_dialog`
        const resourceIdKey = `${paramKey}_resourceId`

        const open = (resourceId?: string) => {
            setParams({ [dialogKey]: true, [resourceIdKey]: resourceId ?? null })
        }
        const close = () => {
            setParams({ [dialogKey]: false, [resourceIdKey]: null })
        }

        return {
            isOpen: (params as Record<string, unknown>)[dialogKey] as boolean,
            resourceId: (params as Record<string, unknown>)[resourceIdKey] as string | null,
            open,
            close,
        }
    }

    const [params, setParams] = defaultState

    const open = (resourceId?: string) => {
        setParams({ dialog: true, resourceId: resourceId ?? null })
    }
    const close = () => {
        setParams({ dialog: false, resourceId: null })
    }

    return {
        isOpen: params.dialog,
        resourceId: params.resourceId,
        open,
        close,
    }
}

export default function FormDialog(props: {
    children: (resourceId: string | null) => React.ReactNode
    title: string
    paramKey?: string
    onClose?: () => void
    hideTrigger?: boolean
}) {
    const { isOpen, resourceId, open, close } = useFormDialog(props.paramKey)

    return (
        <>
            {!props.hideTrigger && (
                <Button size='lg' onClick={() => open()}>
                    <Plus />
                    {props.title}
                </Button>
            )}
            <Dialog open={isOpen} onOpenChange={(v) => {
                if (!v) {
                    close();
                    props.onClose?.()
                }
            }}>
                <DialogContent className='min-w-xl'>
                    <DialogHeader>
                        <DialogTitle className='text-2xl font-bold'>
                            {props.title}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className='max-h-[80vh]'>
                        {props.children(resourceId)}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}
