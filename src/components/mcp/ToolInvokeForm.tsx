import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { format, isValid, parseISO } from 'date-fns';
import { AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResultRenderer } from './ResultRenderer';
import { Textarea } from '@/components/ui/textarea';
import { formatDisplayValue, formatFieldLabel, getCommonFieldOptions, isPlainObject } from '@/lib/mcp';
import { type McpToolDetails } from '@/lib/mcp';

type FieldDescriptor = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  enumValues?: any[];
  isJsonField: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  isDateField?: boolean;
};

export function ToolInvokeForm({
  tool,
  onInvoke,
}: {
  tool: McpToolDetails | null | undefined;
  onInvoke: (params: Record<string, unknown>) => Promise<unknown>;
}) {
  const schema = tool?.input_schema ?? tool?.schema ?? {};
  const properties = schema.properties && isPlainObject(schema.properties) ? schema.properties : {};
  const requiredFields = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
  const sampleParams = tool?.sample_params ?? tool?.example_params ?? {};

  const fields = useMemo<FieldDescriptor[]>(() => {
    return Object.entries(properties).map(([name, definition]) => {
      const type = typeof definition === 'object' && definition && 'type' in definition ? String((definition as any).type) : 'string';
      const fieldFormat = typeof definition === 'object' && definition && 'format' in definition ? String((definition as any).format) : undefined;
      const enumValues = typeof definition === 'object' && definition && Array.isArray((definition as any).enum) ? (definition as any).enum : undefined;
      const isDateField = fieldFormat === 'date' || name.toLowerCase().includes('date');
      const options = enumValues
        ? enumValues.map((option) => ({ label: String(option), value: option as string | number | boolean }))
        : !isDateField
          ? getCommonFieldOptions(name, type)
          : [];
      const isJsonField = !['string', 'number', 'integer', 'boolean'].includes(type) || name === 'params';

      return {
        name,
        label: formatFieldLabel(name, typeof definition === 'object' && definition && (definition as any).title),
        type,
        required: requiredFields.has(name),
        description: typeof definition === 'object' && definition ? (definition as any).description : undefined,
        enumValues,
        isJsonField: isJsonField && options.length === 0 && !isDateField,
        options: options.length > 0 ? options : undefined,
        isDateField,
      };
    });
  }, [properties, requiredFields]);

  const defaultValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    fields.forEach((field) => {
      const candidate = sampleParams[field.name];
      if (field.isJsonField) {
        values[field.name] = candidate !== undefined ? JSON.stringify(candidate, null, 2) : '';
      } else if (candidate !== undefined) {
        values[field.name] = candidate;
      } else if (field.type === 'boolean') {
        values[field.name] = false;
      } else {
        values[field.name] = '';
      }
    });
    return values;
  }, [fields, sampleParams]);

  const form = useForm<Record<string, any>>({ defaultValues });
  const [result, setResult] = useState<unknown>(null);
  const defaultKey = useMemo(() => JSON.stringify(defaultValues), [defaultValues]);
  const lastDefaultKeyRef = useRef(defaultKey);

  useEffect(() => {
    if (lastDefaultKeyRef.current !== defaultKey) {
      form.reset(defaultValues);
      lastDefaultKeyRef.current = defaultKey;
    }
  }, [defaultKey, defaultValues, form]);

  if (!tool) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run manually</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>Loading tool details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const submitHandler = async (values: Record<string, any>) => {
    const payload: Record<string, unknown> = {};

    for (const field of fields) {
      const value = values[field.name];

      if (field.isJsonField) {
        if (value === '' || value === undefined || value === null) {
          if (field.required) {
            toast.error(`${field.label} is required.`);
            return;
          }

          continue;
        }

        try {
          payload[field.name] = typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          toast.error(`${field.label} must be valid data.`);
          return;
        }

        continue;
      }

      if (field.isDateField) {
        payload[field.name] = value || undefined;
        continue;
      }

      if (field.type === 'boolean') {
        payload[field.name] = Boolean(value);
        continue;
      }

      if (field.type === 'number' || field.type === 'integer') {
        payload[field.name] = value === '' ? undefined : Number(value);
        continue;
      }

      payload[field.name] = value;
    }

    const response = await onInvoke(payload);
    setResult(response);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run manually</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(submitHandler)}>
            {fields.length > 0 ? (
              <div className="grid gap-4">
                {fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {field.label}
                      {field.required && <Badge variant="destructive" appearance="light">Required</Badge>}
                    </Label>
                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}

                    <Controller
                      control={form.control}
                      name={field.name}
                      rules={field.required ? { required: `${field.label} is required` } : undefined}
                      render={({ field: controllerField, fieldState }) => {
                        if (field.type === 'boolean') {
                          return (
                            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                              <Checkbox checked={Boolean(controllerField.value)} onCheckedChange={(checked) => controllerField.onChange(Boolean(checked))} />
                              <span className="text-sm text-foreground">Enabled</span>
                              {fieldState.error && <span className="ml-auto text-xs text-destructive">{fieldState.error.message}</span>}
                            </div>
                          );
                        }

                        if (field.isDateField) {
                          const selectedDate = controllerField.value ? parseISO(String(controllerField.value)) : undefined;
                          const selectedValidDate = selectedDate && isValid(selectedDate) ? selectedDate : undefined;

                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" className="h-11 w-full justify-start font-normal">
                                  {selectedValidDate ? format(selectedValidDate, 'PPP') : 'Pick a date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedValidDate}
                                  onSelect={(date) => controllerField.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          );
                        }

                        if (field.enumValues?.length) {
                          return (
                            <select
                              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={controllerField.value ?? ''}
                              onChange={(event) => controllerField.onChange(event.target.value)}
                            >
                              <option value="">Select an option</option>
                              {field.enumValues.map((option) => (
                                <option key={String(option)} value={String(option)}>
                                  {String(option)}
                                </option>
                              ))}
                            </select>
                          );
                        }

                        if (field.options?.length) {
                          return (
                            <select
                              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={controllerField.value ?? ''}
                              onChange={(event) => {
                                const selectedValue = event.target.value;
                                const option = field.options?.find((entry) => String(entry.value) === selectedValue);
                                controllerField.onChange(option ? option.value : selectedValue);
                              }}
                            >
                              <option value="">Select an option</option>
                              {field.options.map((option) => (
                                <option key={String(option.value)} value={String(option.value)}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          );
                        }

                        if (field.isJsonField) {
                          return (
                            <Textarea
                              value={controllerField.value ?? ''}
                              onChange={controllerField.onChange}
                              className="min-h-[140px] font-mono text-xs"
                              placeholder="Provide structured input"
                            />
                          );
                        }

                        return (
                          <Input
                            value={controllerField.value ?? ''}
                            onChange={controllerField.onChange}
                            placeholder={field.label}
                            type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                          />
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>No structured schema was provided. Use the sample params to understand the available fields.</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">Current sample: {formatDisplayValue(sampleParams)}</p>
              <Button type="submit">
                <Play className="size-4" />
                Run tool
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && <ResultRenderer result={result} toolName={tool?.name} className="shadow-none" />}
    </div>
  );
}