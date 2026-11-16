import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";

describe("CountryPhoneInput Component", () => {
  it("renderiza por padrão a bandeira do Brasil (🇧🇷) e o DDI (+55)", () => {
    render(<CountryPhoneInput value="" onChange={() => {}} />);
    const button = screen.getByTestId("country-select-button");
    expect(button.textContent).toContain("🇧🇷");
    expect(button.textContent).toContain("+55");
  });

  it("abre o dropdown de países ao clicar no botão de bandeira", () => {
    render(<CountryPhoneInput value="" onChange={() => {}} />);
    const button = screen.getByTestId("country-select-button");

    expect(screen.queryByTestId("country-dropdown-menu")).toBeNull();

    fireEvent.click(button);
    expect(screen.getByTestId("country-dropdown-menu")).toBeDefined();
    expect(screen.getByTestId("country-option-pt")).toBeDefined();
    expect(screen.getByTestId("country-option-us")).toBeDefined();
  });

  it("permite selecionar outro país e atualiza a bandeira e o DDI", () => {
    const handleChange = vi.fn();
    render(<CountryPhoneInput value="" onChange={handleChange} />);

    // Abre o menu
    fireEvent.click(screen.getByTestId("country-select-button"));

    // Seleciona Portugal
    fireEvent.click(screen.getByTestId("country-option-pt"));

    const button = screen.getByTestId("country-select-button");
    expect(button.textContent).toContain("🇵🇹");
    expect(button.textContent).toContain("+351");
  });

  it("dispara onChange com o DDI do país e o número digitado", () => {
    const handleChange = vi.fn();
    render(<CountryPhoneInput value="" onChange={handleChange} />);

    const input = screen.getByTestId("input-whatsapp");
    fireEvent.change(input, { target: { value: "85988146141" } });

    expect(handleChange).toHaveBeenCalledWith("+5585988146141");
  });

  it("filtra países ao digitar no campo de busca do dropdown", () => {
    render(<CountryPhoneInput value="" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId("country-select-button"));

    const searchInput = screen.getByTestId("country-search-input");
    fireEvent.change(searchInput, { target: { value: "Espanha" } });

    expect(screen.getByTestId("country-option-es")).toBeDefined();
    expect(screen.queryByTestId("country-option-pt")).toBeNull();
  });
});
