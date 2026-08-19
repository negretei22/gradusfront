import { TestBed } from '@angular/core/testing';

import { ObraPuertoPenascoService } from './obra-puerto-penasco.service';

describe('ObraPuertoPenascoService', () => {
  let service: ObraPuertoPenascoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObraPuertoPenascoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
