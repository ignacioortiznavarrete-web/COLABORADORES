using System;
using System.Collections.Generic;
using System.Globalization;
using IPVG.Sede.Core;
using Colaborador = IPVG.Sede.Core.ColaboradorSede;

namespace IPVG.Sede.App;

public static class Program
{
    public static void Main()
    {
        CultureInfo.CurrentCulture = new CultureInfo("es-CL");

        List<ColaboradorSede> nomina = new List<ColaboradorSede>();
        int opcion;

        do
        {
            Console.WriteLine();
            Console.WriteLine("===== NÓMINA SEDE IPVG =====");
            Console.WriteLine("1. Registrar docente");
            Console.WriteLine("2. Listar nómina");
            Console.WriteLine("3. Calcular gasto total en sueldos");
            Console.WriteLine("0. Salir");
            opcion = LeerEntero("Seleccione una opción: ");

            switch (opcion)
            {
                case 1:
                    RegistrarDocente(nomina);
                    break;
                case 2:
                    ListarNomina(nomina);
                    break;
                case 3:
                    CalcularGastoTotal(nomina);
                    break;
                case 0:
                    Console.WriteLine("Saliendo del sistema...");
                    break;
                default:
                    Console.WriteLine("Opción no válida.");
                    break;
            }
        } while (opcion != 0);
    }

    private static void RegistrarDocente(List<ColaboradorSede> nomina)
    {
        string rut = LeerTexto("RUT: ");
        string nombre = LeerTexto("Nombre: ");
        decimal sueldoBase = LeerDecimal("Sueldo base: ");
        int horasOtec = LeerEntero("Horas OTEC dictadas: ");

        DocenteSede docente = new DocenteSede(rut, nombre, sueldoBase, horasOtec);
        nomina.Add(docente);

        if (sueldoBase < ColaboradorSede.SueldoMinimoLegal)
        {
            Console.WriteLine($"Sueldo base inferior al mínimo legal; se asignó {docente.SueldoBase:C0}.");
        }
        Console.WriteLine("Docente registrado correctamente.");
    }

    private static void ListarNomina(List<ColaboradorSede> nomina)
    {
        if (nomina.Count == 0)
        {
            Console.WriteLine("La nómina está vacía.");
            return;
        }

        foreach (Colaborador colaborador in nomina)
        {
            Console.WriteLine(colaborador);
        }
    }

    private static void CalcularGastoTotal(List<ColaboradorSede> nomina)
    {
        decimal total = 0;
        foreach (Colaborador colaborador in nomina)
        {
            total += colaborador.CalcularSueldoTotal();
        }
        Console.WriteLine($"Gasto total en sueldos de la sede: {total:C0} ({nomina.Count} colaboradores)");
    }

    private static string LeerTexto(string mensaje)
    {
        string? valor;
        do
        {
            Console.Write(mensaje);
            valor = Console.ReadLine()?.Trim();
        } while (string.IsNullOrEmpty(valor));
        return valor;
    }

    private static int LeerEntero(string mensaje)
    {
        int valor;
        Console.Write(mensaje);
        while (!int.TryParse(Console.ReadLine(), out valor) || valor < 0)
        {
            Console.Write("Valor inválido. " + mensaje);
        }
        return valor;
    }

    private static decimal LeerDecimal(string mensaje)
    {
        decimal valor;
        Console.Write(mensaje);
        while (!decimal.TryParse(Console.ReadLine(), NumberStyles.Number, CultureInfo.CurrentCulture, out valor) || valor < 0)
        {
            Console.Write("Valor inválido. " + mensaje);
        }
        return valor;
    }
}
