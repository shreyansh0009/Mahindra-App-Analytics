import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import useDebounce from '../../hooks/useDebounce';

const SearchInput = ({ placeholder = 'Search...', onSearch, delay = 400, className = '' }) => {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, delay);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-8"
      />
    </div>
  );
};

export default SearchInput;
