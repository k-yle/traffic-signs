export interface Placeholder {
  domId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font: string | undefined;
  example: string | undefined;
  type: string | undefined;
}

export interface DB {
  [countryCode: string]: {
    [signCode: string]: {
      name: string | undefined;
      docs: string | undefined;
      urls: {
        [id: string]: string;
      };
      placeholders?: Placeholder[];
    };
  };
}
