import { useEffect } from 'react';

export default function useDocumentTitle(title, isAdmin = false) {
  useEffect(() => {
    if (title) {
      const prefix = isAdmin ? 'RISE Admin | ' : 'RISE | ';
      document.title = `${prefix}${title}`;
    } else {
      document.title = isAdmin ? 'RISE Admin' : 'RISE';
    }
  }, [title, isAdmin]);
}
