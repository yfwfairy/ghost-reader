type AddToLibraryCardProps = {
  onImport: () => Promise<void>
}

export function AddToLibraryCard({ onImport }: AddToLibraryCardProps) {
  return (
    <button
      className="add-library-card"
      type="button"
      aria-label="Add a book to your library"
      onClick={() => void onImport()}
    >
      <span className="add-library-card__icon">+</span>
      <span className="add-library-card__label">Add to Library</span>
    </button>
  )
}
