export interface DB {
  [countryCode: string]: {
    [signCode: string]: {
      name: string | undefined;
      docs: string | undefined;
      urls: {
        [id: string]: string;
      };
    };
  };
}
