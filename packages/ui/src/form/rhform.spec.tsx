import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Rhform } from './rhform';

function Harness() {
  const form = useForm<{ title: string }>({ defaultValues: { title: '' } });
  return (
    <Rhform form={form} onSubmit={() => {}}>
      <span>hello</span>
    </Rhform>
  );
}

describe('Rhform', () => {
  it('renders its children inside the form provider', () => {
    render(<Harness />);
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
