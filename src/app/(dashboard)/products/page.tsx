"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BillingStore, Product } from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form
  const [name, setName] = useState("");
  const [hsn, setHsn] = useState("");
  const [unit, setUnit] = useState<"KG" | "PCS" | "MTR" | "BOX" | "CONE">("KG");
  const [rate, setRate] = useState("");
  const [gstRate, setGstRate] = useState("5");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Jari");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    loadData();
    const unsubscribe = BillingStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setProducts(BillingStore.getProducts());
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName("");
    setHsn("5605002");
    setUnit("KG");
    setRate("333.3333");
    setGstRate("5");
    setStock("1000");
    setCategory("Jari");
    setDesc("");
    setIsOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setHsn(p.hsn);
    setUnit(p.unit);
    setRate(String(p.defaultRate));
    setGstRate(String(p.gstRate));
    setStock(String(p.stock));
    setCategory(p.category);
    setDesc(p.description || "");
    setIsOpen(true);
  };

  const handleSaveProduct = () => {
    if (!name.trim() || !hsn.trim() || !rate.trim()) {
      toast.error("Please fill required fields (Name, HSN, Default Rate)");
      return;
    }

    const prod: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: name.trim().toUpperCase(),
      hsn: hsn.trim(),
      unit,
      defaultRate: parseFloat(rate) || 0,
      gstRate: parseFloat(gstRate) || 5,
      stock: parseFloat(stock) || 0,
      category: category.trim(),
      description: desc.trim(),
    };

    BillingStore.saveProduct(prod);
    loadData();
    setIsOpen(false);
    toast.success(`Product ${prod.name} saved successfully!`);
  };

  const handleDelete = (id: string, prodName: string) => {
    if (confirm(`Delete product ${prodName}?`)) {
      BillingStore.deleteProduct(id);
      loadData();
      toast.success("Product removed from master");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.hsn.includes(search) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Product Master</span>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-800 rounded-md">
              {products.length} Items
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maintain HSN codes, standard rates, GST brackets, and stock for Thread & Jari products
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 px-4 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product name, HSN, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3 min-w-[220px]">Product / Particulars</th>
                  <th className="p-3 w-28 text-center">HSN Code</th>
                  <th className="p-3 w-24 text-center">Unit</th>
                  <th className="p-3 w-32 text-right">Default Rate (₹)</th>
                  <th className="p-3 w-24 text-center">Default GST</th>
                  <th className="p-3 w-28 text-right">Stock</th>
                  <th className="p-3 w-28">Category</th>
                  <th className="p-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-[#121016] transition-colors"
                  >
                    <td className="p-3 font-semibold uppercase text-foreground">
                      {p.name}
                      {p.description && (
                        <span className="block text-[10px] text-muted-foreground font-normal lowercase">
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-purple-700 dark:text-purple-300">
                      {p.hsn}
                    </td>
                    <td className="p-3 text-center font-medium text-muted-foreground">
                      {p.unit}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-foreground">
                      ₹{formatNumber(p.defaultRate, 4)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="secondary"
                        className="font-medium text-[10px] rounded-md"
                      >
                        {p.gstRate}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-muted-foreground">
                      {formatNumber(p.stock, 0)} {p.unit}
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                          title="Edit product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingProduct ? "Edit Product Master" : "Add Product to Master"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Product Name *</Label>
              <Input
                placeholder="e.g. JARI KASAB / VISCOSE YARN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 uppercase font-semibold rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">HSN Code *</Label>
                <Input
                  placeholder="5605002 or 5403"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  className="mt-1 font-mono font-semibold rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit of Measurement</Label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-3 font-medium text-xs"
                >
                  <option value="KG">KG (Kilograms)</option>
                  <option value="PCS">PCS (Pieces)</option>
                  <option value="MTR">MTR (Meters)</option>
                  <option value="BOX">BOX</option>
                  <option value="CONE">CONE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Default Rate (₹) *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="333.3333"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="mt-1 font-mono font-semibold rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">GST Bracket</Label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-2 font-mono font-semibold text-xs text-center"
                >
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Stock Quantity</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 font-mono rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <Input
                placeholder="Jari / Yarn / Thread / Kasab"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 rounded-md"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Notes</Label>
              <Input
                placeholder="Specification or thread grade"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="mt-1 rounded-md"
              />
            </div>

            <Button
              onClick={handleSaveProduct}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md"
            >
              Save Product Master
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
