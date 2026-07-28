declare module "@excel.js/exceljs" {
  namespace ExcelJS {
    type CellValue = unknown;

    interface Cell {
      alignment: unknown;
      border: unknown;
      fill: unknown;
      font: unknown;
      value: CellValue;
    }

    interface Column {
      width: number;
    }

    interface Row {
      alignment: unknown;
      eachCell(callback: (cell: Cell) => void): void;
      fill: unknown;
      font: unknown;
      height: number;
      number: number;
      values: CellValue[] | Record<string, CellValue>;
    }

    interface Worksheet {
      addRow(values: CellValue[]): Row;
      autoFilter: unknown;
      eachRow(callback: (row: Row) => void): void;
      eachRow(
        options: { includeEmpty: boolean },
        callback: (row: Row, rowNumber: number) => void,
      ): void;
      getCell(address: string): Cell;
      getCell(row: number, column: number): Cell;
      getColumn(column: number): Column;
      getRow(row: number): Row;
      mergeCells(
        startRow: number,
        startColumn: number,
        endRow: number,
        endColumn: number,
      ): void;
    }

    class Workbook {
      created: Date;
      creator: string;
      modified: Date;
      subject: string;
      title: string;
      xlsx: {
        load(source: ArrayBuffer): Promise<Workbook>;
        writeBuffer(): Promise<ArrayBuffer>;
      };
      addWorksheet(
        name: string,
        options?: {
          properties?: { defaultRowHeight?: number };
          views?: Array<{ state: string; ySplit: number }>;
        },
      ): Worksheet;
      getWorksheet(name: string): Worksheet | undefined;
    }
  }

  const ExcelJS: {
    Workbook: typeof ExcelJS.Workbook;
  };
  export default ExcelJS;
}
