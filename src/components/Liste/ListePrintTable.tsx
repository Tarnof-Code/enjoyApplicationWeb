import { PRINT_GLOBAL_CLASS } from "../../print";
import type { ColumnConfig } from "./Liste";

export type ListePrintTableProps<T> = {
    visibleColumns: ColumnConfig[];
    rows: T[];
    getRowKey: (item: T, index: number) => string | number;
    renderPrintCell: (column: ColumnConfig, item: T) => string;
    emptyMessage: string;
};

export function ListePrintTable<T>({
    visibleColumns,
    rows,
    getRowKey,
    renderPrintCell,
    emptyMessage,
}: ListePrintTableProps<T>) {
    const cellClassName = (column: ColumnConfig) =>
        column.printNoWrap ? PRINT_GLOBAL_CLASS.listePrintNoWrap : undefined;

    return (
        <div className={PRINT_GLOBAL_CLASS.listePrintWrap}>
            <table
                className={`${PRINT_GLOBAL_CLASS.listePrintTable} ${PRINT_GLOBAL_CLASS.only}`}
            >
                <thead>
                    <tr>
                        {visibleColumns.map((column) => (
                            <th
                                key={column.key}
                                colSpan={column.colSpan || 1}
                                className={cellClassName(column)}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={visibleColumns.length} className="text-center">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((item, index) => (
                            <tr key={getRowKey(item, index)}>
                                {visibleColumns.map((column) => (
                                    <td
                                        key={column.key}
                                        colSpan={column.colSpan || 1}
                                        className={cellClassName(column)}
                                    >
                                        {renderPrintCell(column, item)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
